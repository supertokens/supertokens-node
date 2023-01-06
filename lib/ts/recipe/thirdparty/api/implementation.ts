import { APIInterface } from "../";
import Session from "../../session";
import * as qs from "querystring";
import EmailVerification from "../../emailverification/recipe";

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

        signInUpPOST: async function ({ provider, redirectURIInfo, oAuthTokens, options, userContext }) {
            let oAuthTokensToUse: any = {};

            if (redirectURIInfo !== undefined) {
                oAuthTokensToUse = await provider.exchangeAuthCodeForOAuthTokens({
                    redirectURIInfo,
                    userContext,
                });
            } else {
                oAuthTokensToUse = oAuthTokens;
            }

            const userInfo = await provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });

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
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                userContext,
            });

            // we set the email as verified if already verified by the OAuth provider.
            // This block was added because of https://github.com/supertokens/supertokens-core/issues/295
            if (emailInfo.isVerified) {
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            userId: response.user.id,
                            email: response.user.email,
                            userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            token: tokenResponse.token,
                            userContext,
                        });
                    }
                }
            }

            let session = await Session.createNewSession(options.res, response.user.id, {}, {}, userContext);
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
            const queryString = qs.stringify(formPostInfoFromProvider);
            const state = formPostInfoFromProvider.state;
            const stateObj = JSON.parse(state);
            const redirectURI = stateObj.redirectURI;
            const redirectURL = `${redirectURI}?${queryString}`;

            options.res.setHeader("Location", redirectURL, false);
            options.res.setStatusCode(303);
            options.res.sendHTMLResponse("");
        },
    };
}
