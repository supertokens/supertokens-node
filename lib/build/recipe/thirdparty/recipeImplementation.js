"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const configUtils_1 = require("./providers/configUtils");
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../multitenancy/recipe"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const __1 = require("../..");
const user_1 = require("../../user");
const authUtils_1 = require("../../authUtils");
const constants_1 = require("../multitenancy/constants");
function getRecipeImplementation(querier, providers) {
    return {
        manuallyCreateOrUpdateUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            session,
            userContext,
        }) {
            const accountLinking = recipe_1.default.getInstance();
            const users = await __1.listUsersByAccountInfo(
                tenantId,
                { thirdParty: { id: thirdPartyId, userId: thirdPartyUserId } },
                false,
                userContext
            );
            const user = users[0];
            if (user !== undefined) {
                const isEmailChangeAllowed = await accountLinking.isEmailChangeAllowed({
                    user,
                    isVerified: isVerified,
                    newEmail: email,
                    session,
                    userContext: userContext,
                });
                if (!isEmailChangeAllowed.allowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            isEmailChangeAllowed.reason === "PRIMARY_USER_CONFLICT"
                                ? "Email already associated with another primary user."
                                : "New email cannot be applied to existing account because of account takeover risks.",
                    };
                }
            }
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${tenantId}/recipe/signinup`),
                {
                    thirdPartyId,
                    thirdPartyUserId,
                    email: { id: email, isVerified },
                },
                userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            response.user = new user_1.User(response.user);
            response.recipeUserId = new recipeUserId_1.default(response.recipeUserId);
            await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user: response.user,
                recipeUserId: response.recipeUserId,
                userContext,
            });
            // we do this so that we get the updated user (in case the above
            // function updated the verification status) and can return that
            response.user = await __1.getUser(response.recipeUserId.getAsString(), userContext);
            const linkResult = await authUtils_1.AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo(
                {
                    tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session,
                    userContext,
                }
            );
            if (linkResult.status !== "OK") {
                return linkResult;
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: linkResult.user,
                recipeUserId: response.recipeUserId,
            };
        },
        signInUp: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            userContext,
            oAuthTokens,
            session,
            rawUserInfoFromProvider,
        }) {
            let response = await this.manuallyCreateOrUpdateUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                tenantId,
                isVerified,
                session,
                userContext,
            });
            if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                return {
                    status: "SIGN_IN_UP_NOT_ALLOWED",
                    reason:
                        response.reason === "Email already associated with another primary user."
                            ? "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)"
                            : "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_024)",
                };
            }
            if (response.status === "OK") {
                return Object.assign(Object.assign({}, response), { oAuthTokens, rawUserInfoFromProvider });
            }
            return response;
        },
        getProvider: async function ({ thirdPartyId, tenantId, clientType, userContext }) {
            const mtRecipe = recipe_2.default.getInstanceOrThrowError();
            const tenantConfig = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
            if (tenantConfig === undefined) {
                throw new Error("Tenant not found");
            }
            const mergedProviders = configUtils_1.mergeProvidersFromCoreAndStatic(
                tenantConfig.thirdParty.providers,
                providers,
                tenantId === constants_1.DEFAULT_TENANT_ID
            );
            const provider = await configUtils_1.findAndCreateProviderInstance(
                mergedProviders,
                thirdPartyId,
                clientType,
                userContext
            );
            return provider;
        },
    };
}
exports.default = getRecipeImplementation;
