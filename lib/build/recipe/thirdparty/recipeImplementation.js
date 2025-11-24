"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeImplementation;
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
            shouldTryLinkingWithSessionUser,
            userContext,
        }) {
            const accountLinking = recipe_1.default.getInstanceOrThrowError();
            const users = await (0, __1.listUsersByAccountInfo)(
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
                {
                    path: "/<tenantId>/recipe/signinup",
                    params: {
                        tenantId: tenantId,
                    },
                },
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
            let userAsObj = user_1.User.fromApi(response.user);
            const recipeUserIdAsObj = new recipeUserId_1.default(response.recipeUserId);
            await recipe_1.default.getInstanceOrThrowError().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user: userAsObj,
                recipeUserId: recipeUserIdAsObj,
                userContext,
            });
            // we do this so that we get the updated user (in case the above
            // function updated the verification status) and can return that
            userAsObj = await (0, __1.getUser)(recipeUserIdAsObj.getAsString(), userContext);
            const linkResult =
                await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId,
                    shouldTryLinkingWithSessionUser,
                    inputUser: userAsObj,
                    recipeUserId: recipeUserIdAsObj,
                    session,
                    userContext,
                });
            if (linkResult.status !== "OK") {
                return linkResult;
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: linkResult.user,
                recipeUserId: recipeUserIdAsObj,
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
            shouldTryLinkingWithSessionUser,
            rawUserInfoFromProvider,
        }) {
            let response = await this.manuallyCreateOrUpdateUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                tenantId,
                isVerified,
                session,
                shouldTryLinkingWithSessionUser,
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
            const mergedProviders = (0, configUtils_1.mergeProvidersFromCoreAndStatic)(
                tenantConfig.thirdParty.providers,
                providers,
                tenantId === constants_1.DEFAULT_TENANT_ID
            );
            const provider = await (0, configUtils_1.findAndCreateProviderInstance)(
                mergedProviders,
                thirdPartyId,
                clientType,
                userContext
            );
            return provider;
        },
    };
}
