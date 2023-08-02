import { APIInterface } from "../";
import Session from "../../session";
import AccountLinking from "../../accountlinking/recipe";

import { RecipeLevelUser } from "../../accountlinking/types";
import { listUsersByAccountInfo, getUser } from "../../..";

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

            let response = await options.recipeImplementation.signInUp({
                thirdPartyId: provider.id,
                thirdPartyUserId: userInfo.thirdPartyUserId,
                email: emailInfo.id,

                isVerified: emailInfo.isVerified,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                tenantId,
                userContext,
            });

            if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                return response;
            }

            let loginMethod: RecipeLevelUser | undefined = undefined;
            for (let i = 0; i < response.user.loginMethods.length; i++) {
                if (
                    response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                        id: provider.id,
                        userId: userInfo.thirdPartyUserId,
                    })
                ) {
                    loginMethod = response.user.loginMethods[i];
                }
            }

            if (loginMethod === undefined) {
                throw new Error("Should never come here");
            }

            const existingUsers = await listUsersByAccountInfo({
                email: emailInfo.id,
            });

            if (existingUsers.length > 0) {
                // Here we do this check after sign in is done cause:
                // - We first want to check if the credentials are correct first or not
                // - The above recipe function marks the email as verified if other linked users
                // with the same email are verified. The function below checks for the email verification
                // so we want to call it only once this is up to date,
                // - Even though the above call to signInUp is state changing (it changes the email
                // of the user), it's OK to do this check here cause the isSignInAllowed checks
                // conditions related to account linking and not related to email change. Email change
                // condition checking happens before calling the recipe function anyway.

                let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
                    recipeUserId: loginMethod.recipeUserId,
                    userContext,
                });

                if (!isSignInAllowed) {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support.",
                    };
                }

                // we do account linking only during sign in here cause during sign up,
                // the recipe function above does account linking for us.
                let userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                    tenantId,
                    recipeUserId: loginMethod.recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });

                response.user = (await getUser(userId, userContext))!;
            }

            let session = await Session.createNewSession(
                options.req,
                options.res,
                tenantId,
                loginMethod.recipeUserId,
                {},
                {},
                userContext
            );

            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
                session,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
            };
        },

        appleRedirectHandlerPOST: async function ({ formPostInfoFromProvider, options }): Promise<void> {
            const stateInBase64 = formPostInfoFromProvider.state;
            const state = Buffer.from(stateInBase64, "base64").toString();
            const stateObj = JSON.parse(state);
            const redirectURI = stateObj.redirectURI;

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
