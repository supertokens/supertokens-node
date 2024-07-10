import {
    OAuthTokenResponse,
    OAuthTokens,
    ProviderConfigWithOIDCInfo,
    RecipeInterface,
    TypeNormalisedInput,
    UserInfo,
} from "./types";
import { Querier } from "../../querier";
import RecipeUserId from "../../recipeUserId";
import { User as UserType } from "../../types";
import {
    doGetRequest,
    doPostRequest,
    getOIDCDiscoveryInfo,
    verifyIdTokenFromJWKSEndpointAndGetPayload,
} from "../utils";
import pkceChallenge from "pkce-challenge";
import { getUser } from "../..";
import { logDebugMessage } from "../../logger";
import { JWTVerifyGetKey, createRemoteJWKSet } from "jose";

export default function getRecipeImplementation(_querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    let providerConfigWithOIDCInfo: ProviderConfigWithOIDCInfo | null = null;

    return {
        getAuthorisationRedirectURL: async function ({ redirectURIOnProviderDashboard }) {
            const providerConfig = await this.getProviderConfig();

            const queryParams: { [key: string]: string } = {
                client_id: providerConfig.clientId,
                redirect_uri: redirectURIOnProviderDashboard,
                response_type: "code",
            };

            if (providerConfig.scope !== undefined) {
                queryParams.scope = providerConfig.scope.join(" ");
            }

            let pkceCodeVerifier: string | undefined = undefined;

            if (providerConfig.clientSecret === undefined || providerConfig.forcePKCE) {
                const { code_challenge, code_verifier } = pkceChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128
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
        signIn: async function (
            this: RecipeInterface,
            { userId, tenantId, userContext, oAuthTokens, rawUserInfoFromProvider }
        ): Promise<{
            status: "OK";
            user: UserType;
            recipeUserId: RecipeUserId;
            oAuthTokens: OAuthTokens;
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
        }> {
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new Error(`Failed to getUser from the userId ${userId} in the ${tenantId} tenant`);
            }

            return {
                status: "OK",
                user,
                recipeUserId: new RecipeUserId(userId),
                oAuthTokens,
                rawUserInfoFromProvider,
            };
        },
        getProviderConfig: async function () {
            if (providerConfigWithOIDCInfo !== null) {
                return providerConfigWithOIDCInfo;
            }
            const oidcInfo = await getOIDCDiscoveryInfo(config.providerConfig.oidcDiscoveryEndpoint);

            if (oidcInfo.authorization_endpoint === undefined) {
                throw new Error("Failed to authorization_endpoint from the oidcDiscoveryEndpoint.");
            }
            if (oidcInfo.token_endpoint === undefined) {
                throw new Error("Failed to token_endpoint from the oidcDiscoveryEndpoint.");
            }
            // TODO: We currently don't have this
            // if (oidcInfo.userinfo_endpoint === undefined) {
            //     throw new Error("Failed to userinfo_endpoint from the oidcDiscoveryEndpoint.");
            // }
            if (oidcInfo.jwks_uri === undefined) {
                throw new Error("Failed to jwks_uri from the oidcDiscoveryEndpoint.");
            }

            providerConfigWithOIDCInfo = {
                ...config.providerConfig,
                authorizationEndpoint: oidcInfo.authorization_endpoint,
                tokenEndpoint: oidcInfo.token_endpoint,
                userInfoEndpoint: oidcInfo.userinfo_endpoint,
                jwksURI: oidcInfo.jwks_uri,
            };
            return providerConfigWithOIDCInfo;
        },
        exchangeAuthCodeForOAuthTokens: async function ({
            providerConfig,
            redirectURIInfo,
        }: {
            providerConfig: ProviderConfigWithOIDCInfo;
            redirectURIInfo: {
                redirectURIOnProviderDashboard: string;
                redirectURIQueryParams: any;
                pkceCodeVerifier?: string | undefined;
            };
        }) {
            if (providerConfig.tokenEndpoint === undefined) {
                throw new Error("OAuth2Client provider's tokenEndpoint is not configured.");
            }
            const tokenAPIURL = providerConfig.tokenEndpoint;
            const accessTokenAPIParams: { [key: string]: string } = {
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

            const tokenResponse = await doPostRequest(tokenAPIURL, accessTokenAPIParams);

            if (tokenResponse.status >= 400) {
                logDebugMessage(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
            }

            return tokenResponse.jsonResponse as OAuthTokenResponse;
        },
        getUserInfo: async function ({
            providerConfig,
            oAuthTokens,
        }: {
            providerConfig: ProviderConfigWithOIDCInfo;
            oAuthTokens: OAuthTokens;
        }): Promise<UserInfo> {
            let jwks: JWTVerifyGetKey | undefined;

            const accessToken = oAuthTokens["access_token"];
            const idToken = oAuthTokens["id_token"];

            let rawUserInfoFromProvider: {
                fromUserInfoAPI: any;
                fromIdTokenPayload: any;
            } = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };

            if (idToken && providerConfig.jwksURI !== undefined) {
                if (jwks === undefined) {
                    jwks = createRemoteJWKSet(new URL(providerConfig.jwksURI));
                }

                rawUserInfoFromProvider.fromIdTokenPayload = await verifyIdTokenFromJWKSEndpointAndGetPayload(
                    idToken,
                    jwks,
                    {
                        audience: providerConfig.clientId,
                    }
                );
            }

            if (accessToken && providerConfig.userInfoEndpoint !== undefined) {
                const headers: { [key: string]: string } = {
                    Authorization: "Bearer " + accessToken,
                };
                const queryParams: { [key: string]: string } = {};

                const userInfoFromAccessToken = await doGetRequest(
                    providerConfig.userInfoEndpoint,
                    queryParams,
                    headers
                );

                if (userInfoFromAccessToken.status >= 400) {
                    logDebugMessage(
                        `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                    );
                    throw new Error(
                        `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                    );
                }

                rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken.jsonResponse;
            }

            let userId: string | undefined = undefined;

            if (rawUserInfoFromProvider.fromIdTokenPayload !== undefined) {
                userId = rawUserInfoFromProvider.fromIdTokenPayload["sub"];
            } else if (rawUserInfoFromProvider.fromUserInfoAPI !== undefined) {
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
