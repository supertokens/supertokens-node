import { APIInterface } from "../";
import Session from "../../session";
import { OAuthTokens } from "../types";

export default function getAPIInterface(): APIInterface {
    return {
        signInPOST: async function (input) {
            const { options, tenantId, userContext } = input;

            const providerConfig = await options.recipeImplementation.getProviderConfig({ userContext });

            let oAuthTokensToUse: OAuthTokens = {};

            if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                oAuthTokensToUse = await options.recipeImplementation.exchangeAuthCodeForOAuthTokens({
                    providerConfig,
                    redirectURIInfo: input.redirectURIInfo,
                    userContext,
                });
            } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                oAuthTokensToUse = input.oAuthTokens;
            } else {
                throw Error("should never come here");
            }

            const { userId, rawUserInfo } = await options.recipeImplementation.getUserInfo({
                providerConfig,
                oAuthTokens: oAuthTokensToUse,
                userContext,
            });

            const { user, recipeUserId } = await options.recipeImplementation.signIn({
                userId,
                tenantId,
                rawUserInfo,
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
                rawUserInfo,
            };
        },
    };
}
