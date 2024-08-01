"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const thirdpartyUtils_1 = require("../../thirdpartyUtils");
const pkce_challenge_1 = __importDefault(require("pkce-challenge"));
const __1 = require("../..");
const logger_1 = require("../../logger");
const jose_1 = require("jose");
function getRecipeImplementation(_querier, config) {
    let providerConfigWithOIDCInfo = null;
    return {
        getAuthorisationRedirectURL: async function ({ providerConfig, redirectURIOnProviderDashboard }) {
            const queryParams = {
                client_id: providerConfig.clientId,
                redirect_uri: redirectURIOnProviderDashboard,
                response_type: "code",
            };
            if (providerConfig.scope !== undefined) {
                queryParams.scope = providerConfig.scope.join(" ");
            }
            let pkceCodeVerifier = undefined;
            if (providerConfig.clientSecret === undefined || providerConfig.forcePKCE) {
                const { code_challenge, code_verifier } = pkce_challenge_1.default(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128
                queryParams["code_challenge"] = code_challenge;
                queryParams["code_challenge_method"] = "S256";
                pkceCodeVerifier = code_verifier;
            }
            const urlObj = new URL(providerConfig.authorizationEndpoint);
            for (const [key, value] of Object.entries(queryParams)) {
                urlObj.searchParams.set(key, value);
            }
            return {
                urlWithQueryParams: urlObj.toString(),
                pkceCodeVerifier: pkceCodeVerifier,
            };
        },
        signIn: async function ({ userId, tenantId, userContext, oAuthTokens, rawUserInfoFromProvider }) {
            const user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                throw new Error(`Failed to getUser from the userId ${userId} in the ${tenantId} tenant`);
            }
            return {
                status: "OK",
                user,
                recipeUserId: new recipeUserId_1.default(userId),
                oAuthTokens,
                rawUserInfoFromProvider,
            };
        },
        getProviderConfig: async function () {
            if (providerConfigWithOIDCInfo !== null) {
                return providerConfigWithOIDCInfo;
            }
            const oidcInfo = await thirdpartyUtils_1.getOIDCDiscoveryInfo(config.providerConfig.oidcDiscoveryEndpoint);
            if (oidcInfo.authorization_endpoint === undefined) {
                throw new Error("Failed to authorization_endpoint from the oidcDiscoveryEndpoint.");
            }
            if (oidcInfo.token_endpoint === undefined) {
                throw new Error("Failed to token_endpoint from the oidcDiscoveryEndpoint.");
            }
            if (oidcInfo.userinfo_endpoint === undefined) {
                throw new Error("Failed to userinfo_endpoint from the oidcDiscoveryEndpoint.");
            }
            if (oidcInfo.jwks_uri === undefined) {
                throw new Error("Failed to jwks_uri from the oidcDiscoveryEndpoint.");
            }
            providerConfigWithOIDCInfo = Object.assign(Object.assign({}, config.providerConfig), {
                authorizationEndpoint: oidcInfo.authorization_endpoint,
                tokenEndpoint: oidcInfo.token_endpoint,
                userInfoEndpoint: oidcInfo.userinfo_endpoint,
                jwksURI: oidcInfo.jwks_uri,
            });
            return providerConfigWithOIDCInfo;
        },
        exchangeAuthCodeForOAuthTokens: async function ({ providerConfig, redirectURIInfo }) {
            if (providerConfig.tokenEndpoint === undefined) {
                throw new Error("OAuth2Client provider's tokenEndpoint is not configured.");
            }
            const tokenAPIURL = providerConfig.tokenEndpoint;
            const accessTokenAPIParams = {
                client_id: providerConfig.clientId,
                redirect_uri: redirectURIInfo.redirectURIOnProviderDashboard,
                code: redirectURIInfo.redirectURIQueryParams["code"],
                grant_type: "authorization_code",
            };
            if (providerConfig.clientSecret !== undefined) {
                accessTokenAPIParams["client_secret"] = providerConfig.clientSecret;
            }
            if (redirectURIInfo.pkceCodeVerifier !== undefined) {
                accessTokenAPIParams["code_verifier"] = redirectURIInfo.pkceCodeVerifier;
            }
            const tokenResponse = await thirdpartyUtils_1.doPostRequest(tokenAPIURL, accessTokenAPIParams);
            if (tokenResponse.status >= 400) {
                logger_1.logDebugMessage(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
            }
            return tokenResponse.jsonResponse;
        },
        getUserInfo: async function ({ providerConfig, oAuthTokens }) {
            var _a, _b;
            let jwks;
            const accessToken = oAuthTokens["access_token"];
            const idToken = oAuthTokens["id_token"];
            let rawUserInfoFromProvider = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };
            if (idToken && providerConfig.jwksURI !== undefined) {
                if (jwks === undefined) {
                    jwks = jose_1.createRemoteJWKSet(new URL(providerConfig.jwksURI));
                }
                rawUserInfoFromProvider.fromIdTokenPayload = await thirdpartyUtils_1.verifyIdTokenFromJWKSEndpointAndGetPayload(
                    idToken,
                    jwks,
                    {
                        audience: providerConfig.clientId,
                    }
                );
            }
            if (accessToken && providerConfig.userInfoEndpoint !== undefined) {
                const headers = {
                    Authorization: "Bearer " + accessToken,
                };
                const queryParams = {};
                const userInfoFromAccessToken = await thirdpartyUtils_1.doGetRequest(
                    providerConfig.userInfoEndpoint,
                    queryParams,
                    headers
                );
                if (userInfoFromAccessToken.status >= 400) {
                    logger_1.logDebugMessage(
                        `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                    );
                    throw new Error(
                        `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                    );
                }
                rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken.jsonResponse;
            }
            let userId = undefined;
            if (
                ((_a = rawUserInfoFromProvider.fromIdTokenPayload) === null || _a === void 0 ? void 0 : _a.sub) !==
                undefined
            ) {
                userId = rawUserInfoFromProvider.fromIdTokenPayload["sub"];
            } else if (
                ((_b = rawUserInfoFromProvider.fromUserInfoAPI) === null || _b === void 0 ? void 0 : _b.sub) !==
                undefined
            ) {
                userId = rawUserInfoFromProvider.fromUserInfoAPI["sub"];
            }
            if (userId === undefined) {
                throw new Error(`Failed to get userId from both the idToken and userInfo endpoint.`);
            }
            return {
                userId,
                rawUserInfoFromProvider,
            };
        },
    };
}
exports.default = getRecipeImplementation;
