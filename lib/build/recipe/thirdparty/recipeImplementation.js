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
const emailverification_1 = __importDefault(require("../emailverification"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const recipe_3 = __importDefault(require("../multitenancy/recipe"));
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
                    email: { id: email },
                }
            );
            if (response.status === "OK") {
                response.user = new user_1.User(response.user);
                let recipeUserId = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "thirdparty" &&
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        })
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId,
                    recipeUserId: recipeUserId,
                    userContext,
                });
                // The above may have marked the user's email as verified already, but in case
                // this is a sign up, or it's a sign in from a non primary user, and the
                // provider said that the user's email is verified, we should mark it as verified
                // here as well
                if (isVerified) {
                    let isInitialized = false;
                    try {
                        recipe_2.default.getInstanceOrThrowError();
                        isInitialized = true;
                    } catch (ignored) {}
                    if (isInitialized) {
                        let verifyResponse = await emailverification_1.default.createEmailVerificationToken(
                            tenantId,
                            recipeUserId,
                            undefined,
                            userContext
                        );
                        if (verifyResponse.status === "OK") {
                            // we pass in false here cause we do not want to attempt account linking
                            // as of yet.
                            await emailverification_1.default.verifyEmailUsingToken(
                                tenantId,
                                verifyResponse.token,
                                false,
                                userContext
                            );
                        }
                    }
                }
                // we do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = await __1.getUser(recipeUserId.getAsString(), userContext);
            }
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
                return response;
            }
            let updatedUser = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                user: response.user,
                userContext,
            });
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: updatedUser,
            };
        },
        signInUp: async function ({ thirdPartyId, thirdPartyUserId, email, isVerified, tenantId, userContext }) {
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
                        "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ANOTHER_PRIM_USER_HAS_EMAIL)",
                };
            }
            return response;
        },
        getProvider: async function ({ thirdPartyId, tenantId, clientType, userContext }) {
            const mtRecipe = recipe_3.default.getInstanceOrThrowError();
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
