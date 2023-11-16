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
function getRecipeImplementation(querier, providers) {
    return {
        manuallyCreateOrUpdateUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            userContext,
        }) {
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
            if (!response.createdNewUser) {
                // Unlike in the sign up scenario, we do not do account linking here
                // cause we do not want sign in to change the potentially user ID of a user
                // due to linking when this function is called by the dev in their API.
                // If we did account linking
                // then we would have to ask the dev to also change the session
                // in such API calls.
                // In the case of sign up, since we are creating a new user, it's fine
                // to link there since there is no user id change really from the dev's
                // point of view who is calling the sign up recipe function.
                return {
                    status: "OK",
                    createdNewRecipeUser: response.createdNewUser,
                    user: response.user,
                    recipeUserId: response.recipeUserId,
                };
            }
            let updatedUser = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                user: response.user,
                userContext,
            });
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: updatedUser,
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
            rawUserInfoFromProvider,
        }) {
            let response = await this.manuallyCreateOrUpdateUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                tenantId,
                isVerified,
                userContext,
            });
            if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                return {
                    status: "SIGN_IN_UP_NOT_ALLOWED",
                    reason:
                        "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
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
                providers
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
