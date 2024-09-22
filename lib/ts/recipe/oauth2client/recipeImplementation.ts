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
} from "../../thirdpartyUtils";
import { getUser } from "../..";
import { logDebugMessage } from "../../logger";
import { JWTVerifyGetKey, createRemoteJWKSet } from "jose";

export default function getRecipeImplementation(_querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    let providerConfigsWithOIDCInfo: Record<string, ProviderConfigWithOIDCInfo> = {};

    return {
        signIn: async function ({
            userId,
            tenantId,
            userContext,
            oAuthTokens,
            rawUserInfo,
        }): Promise<{
            status: "OK";
            user: UserType;
            recipeUserId: RecipeUserId;
            oAuthTokens: OAuthTokens;
            rawUserInfo: {
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
                rawUserInfo,
            };
        },
        getProviderConfig: async function ({ clientId }) {
            if (providerConfigsWithOIDCInfo[clientId] !== undefined) {
                return providerConfigsWithOIDCInfo[clientId];
            }
            console.log("config.providerConfigs", config.providerConfigs, clientId);
            const providerConfig = config.providerConfigs.find(
                (providerConfig) => providerConfig.clientId === clientId
            )!;
            console.log("providerConfig", providerConfig);
            const oidcInfo = await getOIDCDiscoveryInfo(providerConfig.oidcDiscoveryEndpoint);

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

            providerConfigsWithOIDCInfo[clientId] = {
                ...providerConfig,
                authorizationEndpoint: oidcInfo.authorization_endpoint,
                tokenEndpoint: oidcInfo.token_endpoint,
                userInfoEndpoint: oidcInfo.userinfo_endpoint,
                jwksURI: oidcInfo.jwks_uri,
            };

            return providerConfigsWithOIDCInfo[clientId];
        },
        exchangeAuthCodeForOAuthTokens: async function (this: RecipeInterface, { providerConfig, redirectURIInfo }) {
            if (providerConfig.tokenEndpoint === undefined) {
                throw new Error("OAuth2Client provider's tokenEndpoint is not configured.");
            }
            const tokenAPIURL = providerConfig.tokenEndpoint;
            const accessTokenAPIParams: { [key: string]: string } = {
                client_id: providerConfig.clientId,
                redirect_uri: redirectURIInfo.redirectURI,
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
        getUserInfo: async function ({ providerConfig, oAuthTokens }): Promise<UserInfo> {
            let jwks: JWTVerifyGetKey | undefined;

            const accessToken = oAuthTokens["access_token"];
            const idToken = oAuthTokens["id_token"];

            let rawUserInfo: {
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

                rawUserInfo.fromIdTokenPayload = await verifyIdTokenFromJWKSEndpointAndGetPayload(idToken, jwks, {
                    audience: providerConfig.clientId,
                });
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

                rawUserInfo.fromUserInfoAPI = userInfoFromAccessToken.jsonResponse;
            }

            let userId: string | undefined = undefined;

            if (rawUserInfo.fromIdTokenPayload?.sub !== undefined) {
                userId = rawUserInfo.fromIdTokenPayload["sub"];
            } else if (rawUserInfo.fromUserInfoAPI?.sub !== undefined) {
                userId = rawUserInfo.fromUserInfoAPI["sub"];
            }

            if (userId === undefined) {
                throw new Error(`Failed to get userId from both the idToken and userInfo endpoint.`);
            }

            return {
                userId,
                rawUserInfo,
            };
        },
    };
}
