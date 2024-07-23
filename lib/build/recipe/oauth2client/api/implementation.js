"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = __importDefault(require("../../session"));
function getAPIInterface() {
    return {
        authorisationUrlGET: async function ({ options, redirectURIOnProviderDashboard, userContext }) {
            const providerConfig = await options.recipeImplementation.getProviderConfig({ userContext });
            const authUrl = await options.recipeImplementation.getAuthorisationRedirectURL({
                providerConfig,
                redirectURIOnProviderDashboard,
                userContext,
            });
            return Object.assign({ status: "OK" }, authUrl);
        },
        signInPOST: async function (input) {
            const { options, tenantId, userContext } = input;
            const providerConfig = await options.recipeImplementation.getProviderConfig({ userContext });
            let oAuthTokensToUse = {};
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
            const { userId, rawUserInfoFromProvider } = await options.recipeImplementation.getUserInfo({
                providerConfig,
                oAuthTokens: oAuthTokensToUse,
                userContext,
            });
            const { user, recipeUserId } = await options.recipeImplementation.signIn({
                userId,
                tenantId,
                rawUserInfoFromProvider,
                oAuthTokens: oAuthTokensToUse,
                userContext,
            });
            const session = await session_1.default.createNewSession(
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
exports.default = getAPIInterface;
