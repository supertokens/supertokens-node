import { APIInterface } from "../";
import EmailVerification from "../../emailverification";
import EmailVerificationRecipe from "../../emailverification/recipe";
import { AuthUtils } from "../../../authUtils";
import { logDebugMessage } from "../../../logger";
import { decodeBase64 } from "../../../utils";

export default function getAPIInterface(): APIInterface {
    return {
        authorisationUrlGET: async function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            const authUrl = await provider.getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard,
                userContext,
            });
            return {
                status: "OK",
                ...authUrl,
            };
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
            const { provider, tenantId, options, userContext } = input;

            let oAuthTokensToUse: any = {};

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
                    id: await provider.config.generateFakeEmail!({
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

            const authenticatingUser = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
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
            });

            const isSignUp = authenticatingUser === undefined;
            if (authenticatingUser !== undefined) {
                // This is a sign in. So before we proceed, we need to check if an email change
                // is allowed since the email could have changed from the social provider's side.
                // We do this check here and not in the recipe function cause we want to keep the
                // recipe function checks to a minimum so that the dev has complete control of
                // what they can do.

                // The isEmailChangeAllowed and preAuthChecks functions take an isVerified boolean.
                // Now, even though we already have that from the input, that's just what the provider says.
                // If the provider says that the email is NOT verified, it could have been that the email
                // is verified on the user's account via supertokens on a previous sign in / up.
                // So we just check that as well before calling isEmailChangeAllowed

                const recipeUserId = authenticatingUser.loginMethod.recipeUserId;

                if (!emailInfo.isVerified && EmailVerificationRecipe.getInstance() !== undefined) {
                    emailInfo.isVerified = await EmailVerification.isEmailVerified(
                        recipeUserId!,
                        emailInfo.id,
                        userContext
                    );
                }
            }

            const preAuthChecks = await AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId,
                    email: emailInfo.id,
                    thirdParty: {
                        userId: userInfo.thirdPartyUserId,
                        id: provider.id,
                    },
                },
                authenticatingUser: authenticatingUser?.user,
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
                shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
            });

            if (preAuthChecks.status !== "OK") {
                logDebugMessage("signInUpPOST: erroring out because preAuthChecks returned " + preAuthChecks.status);
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return AuthUtils.getErrorStatusResponseWithReason(
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
                shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                tenantId,
                userContext,
            });

            if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                // In this case we do not need to do mapping, since the recipe function already has the right response shape.
                return response;
            }

            if (response.status !== "OK") {
                logDebugMessage("signInUpPOST: erroring out because signInUp returned " + response.status);
                return AuthUtils.getErrorStatusResponseWithReason(response, errorCodeMap, "SIGN_IN_UP_NOT_ALLOWED");
            }

            // Here we do these checks after sign in is done cause:
            // - We first want to check if the credentials are correct first or not
            // - The above recipe function marks the email as verified
            // - Even though the above call to signInUp is state changing (it changes the email
            // of the user), it's OK to do this check here cause the preAuthChecks checks
            // conditions related to account linking
            const postAuthChecks = await AuthUtils.postAuthChecks({
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
                logDebugMessage("signInUpPOST: erroring out because postAuthChecks returned " + postAuthChecks.status);
                return AuthUtils.getErrorStatusResponseWithReason(
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

        appleRedirectHandlerPOST: async function ({ formPostInfoFromProvider, options }): Promise<void> {
            const stateInBase64 = formPostInfoFromProvider.state;
            const state = decodeBase64(stateInBase64);
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
