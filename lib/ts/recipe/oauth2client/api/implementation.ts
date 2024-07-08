import { APIInterface } from "../";
import Session from "../../session";

export default function getAPIInterface(): APIInterface {
    return {
        authorisationUrlGET: async function ({ options, redirectURIOnProviderDashboard }) {
            const authUrl = await options.recipeImplementation.getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard,
            });
            return {
                status: "OK",
                ...authUrl,
            };
        },
        signInPOST: async function (input) {
            const { options, tenantId, userContext } = input;

            const providerConfig = await options.recipeImplementation.getProviderConfig({ userContext });

            let oAuthTokensToUse: any = {};

            if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                oAuthTokensToUse = await options.recipeImplementation.exchangeAuthCodeForOAuthTokens({
                    providerConfig,
                    redirectURIInfo: input.redirectURIInfo,
                });
            } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                oAuthTokensToUse = input.oAuthTokens;
            } else {
                throw Error("should never come here");
            }

            const { userId, rawUserInfoFromProvider } = await options.recipeImplementation.getUserInfo({
                providerConfig,
                oAuthTokens: oAuthTokensToUse,
            });

            const { user, recipeUserId } = await options.recipeImplementation.signIn({
                userId,
                tenantId,
                rawUserInfoFromProvider,
                oAuthTokens: oAuthTokensToUse,
                userContext,
            });

            const session = await Session.createNewSession(
                options.req,
                options.res,
                tenantId,
                recipeUserId,
                undefined,
                undefined,
                userContext
            );

            return {
                status: "OK",
                user,
                session,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider,
            };
        },
    };
}
