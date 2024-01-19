import { TypeProvider, ProviderInput, UserInfo, ProviderConfigForClientType } from "../types";
import { doGetRequest, doPostRequest, verifyIdTokenFromJWKSEndpointAndGetPayload } from "./utils";
import pkceChallenge from "pkce-challenge";
import { getProviderConfigForClient } from "./configUtils";
import { JWTVerifyGetKey, createRemoteJWKSet } from "jose";
import { logDebugMessage } from "../../../logger";

const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
export const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";

// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com", // google
    "467101b197249757c71f", // github
];
const DEV_KEY_IDENTIFIER = "4398792-";

export function isUsingDevelopmentClientId(client_id: string): boolean {
    return client_id.startsWith(DEV_KEY_IDENTIFIER) || DEV_OAUTH_CLIENT_IDS.includes(client_id);
}

export function getActualClientIdFromDevelopmentClientId(client_id: string): string {
    if (client_id.startsWith(DEV_KEY_IDENTIFIER)) {
        return client_id.split(DEV_KEY_IDENTIFIER)[1];
    }
    return client_id;
}

function accessField(obj: any, key: string): any {
    const keyParts = key.split(".");
    for (const k of keyParts) {
        if (obj === undefined) {
            return undefined;
        }

        if (typeof obj !== "object") {
            return undefined;
        }

        obj = obj[k];
    }
    return obj;
}

function getSupertokensUserInfoResultFromRawUserInfo(
    config: ProviderConfigForClientType,
    rawUserInfoResponse: { fromIdTokenPayload: { [key: string]: any }; fromUserInfoAPI: { [key: string]: any } }
): {
    thirdPartyUserId: string;
    email?: { id: string; isVerified: boolean };
} {
    let thirdPartyUserId = "";

    if (config.userInfoMap?.fromUserInfoAPI?.userId !== undefined) {
        const userId = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap.fromUserInfoAPI.userId);
        if (userId !== undefined) {
            thirdPartyUserId = userId;
        }
    }

    if (config.userInfoMap?.fromIdTokenPayload?.userId !== undefined) {
        const userId = accessField(
            rawUserInfoResponse.fromIdTokenPayload,
            config.userInfoMap.fromIdTokenPayload.userId
        );
        if (userId !== undefined) {
            thirdPartyUserId = userId;
        }
    }

    if (thirdPartyUserId === "") {
        throw new Error("third party user id is missing");
    }

    const result: {
        thirdPartyUserId: string;
        email?: { id: string; isVerified: boolean };
    } = {
        thirdPartyUserId,
    };

    let email = "";

    if (config.userInfoMap?.fromUserInfoAPI?.email !== undefined) {
        const emailVal = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap.fromUserInfoAPI.email);
        if (emailVal !== undefined) {
            email = emailVal;
        }
    }

    if (config.userInfoMap?.fromIdTokenPayload?.email !== undefined) {
        const emailVal = accessField(
            rawUserInfoResponse.fromIdTokenPayload,
            config.userInfoMap.fromIdTokenPayload.email
        );
        if (emailVal !== undefined) {
            email = emailVal;
        }
    }

    if (email !== "") {
        result.email = {
            id: email,
            isVerified: false,
        };

        if (config.userInfoMap?.fromUserInfoAPI?.emailVerified !== undefined) {
            const emailVerifiedVal = accessField(
                rawUserInfoResponse.fromUserInfoAPI,
                config.userInfoMap.fromUserInfoAPI.emailVerified!
            );
            result.email.isVerified =
                emailVerifiedVal === true ||
                (typeof emailVerifiedVal === "string" && emailVerifiedVal.toLowerCase() === "true");
        }

        if (config.userInfoMap?.fromIdTokenPayload?.emailVerified !== undefined) {
            const emailVerifiedVal = accessField(
                rawUserInfoResponse.fromIdTokenPayload,
                config.userInfoMap.fromIdTokenPayload.emailVerified!
            );
            result.email.isVerified = emailVerifiedVal === true || emailVerifiedVal === "true";
        }
    }

    return result;
}

export default function NewProvider(input: ProviderInput): TypeProvider {
    // These are safe defaults common to most providers. Each provider implementations override these
    // as necessary
    input.config.userInfoMap = {
        fromIdTokenPayload: {
            userId: "sub",
            email: "email",
            emailVerified: "email_verified",
            ...input.config.userInfoMap?.fromIdTokenPayload,
        },
        fromUserInfoAPI: {
            userId: "sub",
            email: "email",
            emailVerified: "email_verified",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
    };

    if (input.config.generateFakeEmail === undefined) {
        input.config.generateFakeEmail = async function ({ thirdPartyUserId }) {
            return `${thirdPartyUserId}.${input.config.thirdPartyId}@stfakeemail.supertokens.com`;
        };
    }

    let jwks: JWTVerifyGetKey | undefined;

    let impl: TypeProvider = {
        id: input.config.thirdPartyId,
        config: {
            // setting this temporarily. it will be replaced with correct config
            // by the `fetchAndSetConfig` function
            ...input.config,
            clientId: "temp",
        },

        getConfigForClientType: async function ({ clientType }) {
            if (clientType === undefined) {
                if (input.config.clients === undefined || input.config.clients.length !== 1) {
                    throw new Error("please provide exactly one client config or pass clientType or tenantId");
                }

                return getProviderConfigForClient(input.config, input.config.clients[0]);
            }

            if (input.config.clients !== undefined) {
                for (const client of input.config.clients) {
                    if (client.clientType === clientType) {
                        return getProviderConfigForClient(input.config, client);
                    }
                }
            }

            throw new Error(`Could not find client config for clientType: ${clientType}`);
        },

        getAuthorisationRedirectURL: async function ({ redirectURIOnProviderDashboard }) {
            const queryParams: { [key: string]: string } = {
                client_id: impl.config.clientId,
                redirect_uri: redirectURIOnProviderDashboard,
                response_type: "code",
            };

            if (impl.config.scope !== undefined) {
                queryParams.scope = impl.config.scope.join(" ");
            }

            let pkceCodeVerifier: string | undefined = undefined;

            if (impl.config.clientSecret === undefined || impl.config.forcePKCE) {
                const { code_challenge, code_verifier } = pkceChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128
                queryParams["code_challenge"] = code_challenge;
                queryParams["code_challenge_method"] = "S256";
                pkceCodeVerifier = code_verifier;
            }

            if (impl.config.authorizationEndpointQueryParams !== undefined) {
                for (const [key, value] of Object.entries(impl.config.authorizationEndpointQueryParams)) {
                    if (value === null) {
                        delete queryParams[key];
                    } else {
                        queryParams[key] = value;
                    }
                }
            }

            if (impl.config.authorizationEndpoint === undefined) {
                throw new Error("ThirdParty provider's authorizationEndpoint is not configured.");
            }

            let url: string = impl.config.authorizationEndpoint;

            /* Transformation needed for dev keys BEGIN */
            if (isUsingDevelopmentClientId(impl.config.clientId)) {
                queryParams["client_id"] = getActualClientIdFromDevelopmentClientId(impl.config.clientId);
                queryParams["actual_redirect_uri"] = url;
                url = DEV_OAUTH_AUTHORIZATION_URL;
            }
            /* Transformation needed for dev keys END */

            const urlObj = new URL(url);

            for (const [key, value] of Object.entries(queryParams)) {
                urlObj.searchParams.set(key, value);
            }

            return {
                urlWithQueryParams: urlObj.toString(),
                pkceCodeVerifier: pkceCodeVerifier,
            };
        },

        exchangeAuthCodeForOAuthTokens: async function ({ redirectURIInfo }) {
            if (impl.config.tokenEndpoint === undefined) {
                throw new Error("ThirdParty provider's tokenEndpoint is not configured.");
            }
            const tokenAPIURL = impl.config.tokenEndpoint;
            const accessTokenAPIParams: { [key: string]: string } = {
                client_id: impl.config.clientId,
                redirect_uri: redirectURIInfo.redirectURIOnProviderDashboard,
                code: redirectURIInfo.redirectURIQueryParams["code"],
                grant_type: "authorization_code",
            };
            if (impl.config.clientSecret !== undefined) {
                accessTokenAPIParams["client_secret"] = impl.config.clientSecret;
            }
            if (redirectURIInfo.pkceCodeVerifier !== undefined) {
                accessTokenAPIParams["code_verifier"] = redirectURIInfo.pkceCodeVerifier;
            }

            for (const key in impl.config.tokenEndpointBodyParams) {
                if (impl.config.tokenEndpointBodyParams[key] === null) {
                    delete accessTokenAPIParams[key];
                } else {
                    accessTokenAPIParams[key] = impl.config.tokenEndpointBodyParams[key];
                }
            }

            /* Transformation needed for dev keys BEGIN */
            if (isUsingDevelopmentClientId(impl.config.clientId)) {
                accessTokenAPIParams["client_id"] = getActualClientIdFromDevelopmentClientId(impl.config.clientId);
                accessTokenAPIParams["redirect_uri"] = DEV_OAUTH_REDIRECT_URL;
            }
            /* Transformation needed for dev keys END */

            const tokenResponse = await doPostRequest(tokenAPIURL, accessTokenAPIParams);

            if (tokenResponse.status >= 400) {
                logDebugMessage(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
            }

            return tokenResponse.jsonResponse;
        },

        getUserInfo: async function ({ oAuthTokens, userContext }): Promise<UserInfo> {
            const accessToken = oAuthTokens["access_token"];
            const idToken = oAuthTokens["id_token"];

            let rawUserInfoFromProvider: {
                fromUserInfoAPI: any;
                fromIdTokenPayload: any;
            } = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };

            if (idToken && impl.config.jwksURI !== undefined) {
                if (jwks === undefined) {
                    jwks = createRemoteJWKSet(new URL(impl.config.jwksURI));
                }
                rawUserInfoFromProvider.fromIdTokenPayload = await verifyIdTokenFromJWKSEndpointAndGetPayload(
                    idToken,
                    jwks,
                    {
                        audience: getActualClientIdFromDevelopmentClientId(impl.config.clientId),
                    }
                );

                if (impl.config.validateIdTokenPayload !== undefined) {
                    await impl.config.validateIdTokenPayload({
                        idTokenPayload: rawUserInfoFromProvider.fromIdTokenPayload,
                        clientConfig: impl.config,
                        userContext,
                    });
                }
            }

            if (impl.config.validateAccessToken !== undefined && accessToken !== undefined) {
                await impl.config.validateAccessToken({
                    accessToken: accessToken,
                    clientConfig: impl.config,
                    userContext,
                });
            }

            if (accessToken && impl.config.userInfoEndpoint !== undefined) {
                const headers: { [key: string]: string } = {
                    Authorization: "Bearer " + accessToken,
                };
                const queryParams: { [key: string]: string } = {};

                if (impl.config.userInfoEndpointHeaders !== undefined) {
                    for (const [key, value] of Object.entries(impl.config.userInfoEndpointHeaders)) {
                        if (value === null) {
                            delete headers[key];
                        } else {
                            headers[key] = value;
                        }
                    }
                }

                if (impl.config.userInfoEndpointQueryParams !== undefined) {
                    for (const [key, value] of Object.entries(impl.config.userInfoEndpointQueryParams)) {
                        if (value === null) {
                            delete queryParams[key];
                        } else {
                            queryParams[key] = value;
                        }
                    }
                }

                const userInfoFromAccessToken = await doGetRequest(impl.config.userInfoEndpoint, queryParams, headers);

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

            const userInfoResult = getSupertokensUserInfoResultFromRawUserInfo(impl.config, rawUserInfoFromProvider);

            return {
                thirdPartyUserId: userInfoResult.thirdPartyUserId,
                email: userInfoResult.email,
                rawUserInfoFromProvider: rawUserInfoFromProvider,
            };
        },
    };

    // No need to use an overrideable builder here because the functions in the `TypeProvider`
    // are independent of each other and they have no need to call each other from within.
    if (input.override !== undefined) {
        impl = input.override(impl);
    }

    return impl;
}
