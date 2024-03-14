"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const emailverification_1 = __importDefault(require("../../emailverification"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const authUtils_1 = require("../../../authUtils");
const logger_1 = require("../../../logger");
function getAPIInterface() {
    return {
        authorisationUrlGET: async function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            const authUrl = await provider.getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard,
                userContext,
            });
            return Object.assign({ status: "OK" }, authUrl);
        },
        signInUpPOST: async function (input) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_006)",
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_004)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_020)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_021)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_022)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_023)",
                },
            };
            const { provider, tenantId, options, session, userContext } = input;
            let oAuthTokensToUse = {};
            if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                oAuthTokensToUse = await provider.exchangeAuthCodeForOAuthTokens({
                    redirectURIInfo: input.redirectURIInfo,
                    userContext,
                });
            } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                oAuthTokensToUse = input.oAuthTokens;
            } else {
                throw Error("should never come here");
            }
            const userInfo = await provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });
            if (userInfo.email === undefined && provider.config.requireEmail === false) {
                userInfo.email = {
                    id: await provider.config.generateFakeEmail({
                        thirdPartyUserId: userInfo.thirdPartyUserId,
                        tenantId,
                        userContext,
                    }),
                    isVerified: true,
                };
            }
            let emailInfo = userInfo.email;
            if (emailInfo === undefined) {
                return {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                };
            }
            const recipeId = "thirdparty";
            let checkCredentialsOnTenant = async () => {
                // We essentially did this above when calling exchangeAuthCodeForOAuthTokens
                return true;
            };
            const authenticatingUser = await authUtils_1.AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired(
                {
                    accountInfo: {
                        thirdParty: {
                            userId: userInfo.thirdPartyUserId,
                            id: provider.id,
                        },
                    },
                    recipeId,
                    userContext: input.userContext,
                    session: input.session,
                    tenantId,
                    checkCredentialsOnTenant,
                }
            );
            const isSignUp = authenticatingUser === undefined;
            if (authenticatingUser !== undefined) {
                // This is a sign in. So before we proceed, we need to check if an email change
                // is allowed since the email could have changed from the social provider's side.
                // We do this check here and not in the recipe function cause we want to keep the
                // recipe function checks to a minimum so that the dev has complete control of
                // what they can do.
                // The isEmailChangeAllowed function takes in a isVerified boolean. Now, even though
                // we already have that from the input, that's just what the provider says. If the
                // provider says that the email is NOT verified, it could have been that the email
                // is verified on the user's account via supertokens on a previous sign in / up.
                // So we just check that as well before calling isEmailChangeAllowed
                const recipeUserId = authenticatingUser.loginMethod.recipeUserId;
                if (!emailInfo.isVerified && recipe_2.default.getInstance() !== undefined) {
                    emailInfo.isVerified = await emailverification_1.default.isEmailVerified(
                        recipeUserId,
                        emailInfo.id,
                        userContext
                    );
                }
                /**
                 * In this API, during only a sign in, we check for isEmailChangeAllowed first, then
                 * change the email by calling the recipe function, then check if is sign in allowed.
                 * This may result in a few states where email change is allowed, but still, sign in
                 * is not allowed:
                 *
                 * Various outcomes of isSignInAllowed vs isEmailChangeAllowed
                 * isSignInAllowed result:
                 * - is primary user -> TRUE
                 * - is recipe user
                 *      - other recipe user exists
                 *          - no -> TRUE
                 *          - yes
                 *              - email verified -> TRUE
                 *              - email unverified -> FALSE
                 *      - other primary user exists
                 *          - no -> TRUE
                 *          - yes
                 *              - email verification status
                 *                  - this && primary -> TRUE
                 *                  - !this && !primary -> FALSE
                 *                  - this && !primary -> FALSE
                 *                  - !this && primary -> FALSE
                 *
                 * isEmailChangeAllowed result:
                 * - is primary user -> TRUE
                 * - is recipe user
                 *      - other recipe user exists
                 *          - no -> TRUE
                 *          - yes
                 *              - email verified -> TRUE
                 *              - email unverified -> TRUE
                 *      - other primary user exists
                 *          - no -> TRUE
                 *          - yes
                 *              - email verification status
                 *                  - this && primary -> TRUE
                 *                  - !this && !primary -> FALSE
                 *                  - this && !primary -> TRUE
                 *                  - !this && primary -> FALSE
                 *
                 * Based on the above, isEmailChangeAllowed can return true, but isSignInAllowed will return false
                 * in the following situations:
                 * - If a recipe user is signing in with a new email, other recipe users with the same email exist,
                 * and one of them is unverfied. In this case, the email change will happen in the social login
                 * recipe, but the user will not be able to login anyway.
                 *
                 * - If the recipe user is signing in with a new email, there exists a primary user with the same
                 * email, but this new email is verified for the recipe user already, but the primary user's email
                 * is not verified.
                 */
                let isEmailChangeAllowed = await recipe_1.default.getInstance().isEmailChangeAllowed({
                    user: authenticatingUser.user,
                    isVerified: emailInfo.isVerified,
                    newEmail: emailInfo.id,
                    session,
                    userContext,
                });
                if (!isEmailChangeAllowed) {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
                    };
                }
            }
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId,
                    email: emailInfo.id,
                    thirdParty: {
                        userId: userInfo.thirdPartyUserId,
                        id: provider.id,
                    },
                },
                authenticatingUser:
                    authenticatingUser === null || authenticatingUser === void 0 ? void 0 : authenticatingUser.user,
                factorIds: ["thirdparty"],
                isSignUp,
                isVerified: emailInfo.isVerified,
                // this can be true if:
                // - the third party provider marked the email as verified
                // - the email address is changing and the new address has been verified previously
                // in both cases, the user will end up with a verified login method after sign in completes
                signInVerifiesLoginMethod: emailInfo.isVerified,
                skipSessionUserUpdateInCore: false,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });
            if (preAuthChecks.status !== "OK") {
                logger_1.logDebugMessage(
                    "signInUpPOST: erroring out because preAuthChecks returned " + preAuthChecks.status
                );
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            let response = await options.recipeImplementation.signInUp({
                thirdPartyId: provider.id,
                thirdPartyUserId: userInfo.thirdPartyUserId,
                email: emailInfo.id,
                isVerified: emailInfo.isVerified,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                session: input.session,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                logger_1.logDebugMessage("signInUpPOST: erroring out because signInUp returned " + response.status);
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    response,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            // Here we do these checks after sign in is done cause:
            // - We first want to check if the credentials are correct first or not
            // - The above recipe function marks the email as verified
            // - Even though the above call to signInUp is state changing (it changes the email
            // of the user), it's OK to do this check here cause the preAuthChecks checks
            // conditions related to account linking
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                factorId: "thirdparty",
                isSignUp,
                authenticatedUser: response.user,
                recipeUserId: response.recipeUserId,
                req: input.options.req,
                res: input.options.res,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });
            if (postAuthChecks.status !== "OK") {
                logger_1.logDebugMessage(
                    "signInUpPOST: erroring out because postAuthChecks returned " + postAuthChecks.status
                );
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: postAuthChecks.user,
                session: postAuthChecks.session,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
            };
        },
        appleRedirectHandlerPOST: async function ({ formPostInfoFromProvider, options }) {
            const stateInBase64 = formPostInfoFromProvider.state;
            const state = Buffer.from(stateInBase64, "base64").toString();
            const stateObj = JSON.parse(state);
            const redirectURI = stateObj.frontendRedirectURI;
            const urlObj = new URL(redirectURI);
            for (const [key, value] of Object.entries(formPostInfoFromProvider)) {
                urlObj.searchParams.set(key, `${value}`);
            }
            options.res.setHeader("Location", urlObj.toString(), false);
            options.res.setStatusCode(303);
            options.res.sendHTMLResponse("");
        },
    };
}
exports.default = getAPIInterface;
