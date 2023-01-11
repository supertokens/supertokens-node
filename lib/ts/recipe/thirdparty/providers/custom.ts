import { DEFAULT_TENANT_ID } from "../constants";
import { TypeProvider, ProviderInput, UserInfo, ProviderConfigForClientType } from "../types";
import { doGetRequest, doPostRequest, verifyIdTokenFromJWKSEndpointAndGetPayload } from "./utils";
import pkceChallenge from "pkce-challenge";
import { getProviderConfigForClient } from "./configUtils";

const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";

// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com", // google
    "467101b197249757c71f", // github
];
const DEV_KEY_IDENTIFIER = "4398792-";

function isUsingDevelopmentClientId(client_id: string): boolean {
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
        const userId = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap!.fromUserInfoAPI!.userId!);
        if (userId !== undefined) {
            thirdPartyUserId = userId;
        }
    }

    if (config.userInfoMap?.fromIdTokenPayload?.userId !== undefined) {
        const userId = accessField(
            rawUserInfoResponse.fromIdTokenPayload,
            config.userInfoMap!.fromIdTokenPayload!.userId!
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
        const emailVal = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap!.fromUserInfoAPI!.email);
        if (emailVal !== undefined) {
            email = emailVal;
        }
    }

    if (config.userInfoMap?.fromIdTokenPayload?.email !== undefined) {
        const emailVal = accessField(
            rawUserInfoResponse.fromIdTokenPayload,
            config.userInfoMap!.fromIdTokenPayload!.email
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
                config.userInfoMap!.fromUserInfoAPI!.emailVerified!
            );
            result.email.isVerified =
                emailVerifiedVal === true ||
                (typeof emailVerifiedVal === "string" && emailVerifiedVal.toLowerCase() === "true");
        }

        if (config.userInfoMap?.fromIdTokenPayload?.emailVerified !== undefined) {
            const emailVerifiedVal = accessField(
                rawUserInfoResponse.fromIdTokenPayload,
                config.userInfoMap!.fromIdTokenPayload!.emailVerified!
            );
            result.email.isVerified = emailVerifiedVal === true || emailVerifiedVal === "true";
        }
    }

    return result;
}

export default function NewProvider(input: ProviderInput): TypeProvider {
    input.config.userInfoMap = {
        fromIdTokenPayload: {
            userId: "sub",
            email: "email",
            emailVerified: "email_verified",
            ...input.config.userInfoMap?.fromIdTokenPayload,
        },
    };

    if (input.config.generateFakeEmail === undefined) {
        input.config.generateFakeEmail = async function ({ thirdPartyUserId }) {
            thirdPartyUserId = thirdPartyUserId.replace("|", ".");
            return `${thirdPartyUserId}@${input.config.thirdPartyId}.fakeemail.com`;
        };
    }

    let impl: TypeProvider = {
        id: input.config.thirdPartyId,
        config: {
            // setting this temporarily. it will be replaced with correct config
            // by the `fetchAndSetConfig` function
            ...input.config,
            clientID: "temp",
        },

        getConfigForClientType: async function ({ clientType }) {
            if (clientType === undefined) {
                if (input.config.clients === undefined || input.config.clients.length !== 1) {
                    throw new Error("please provide exactly one client config or pass clientType or tenantId");
                }

                return getProviderConfigForClient(input.config, input.config.clients[0]);
            }

            for (const client of input.config.clients || []) {
                if (client.clientType === clientType) {
                    return getProviderConfigForClient(input.config, client);
                }
            }

            throw new Error(`Could not find client config for clientType: ${clientType}`);
        },

        getAuthorisationRedirectURL: async function ({ redirectURIOnProviderDashboard }) {
            const queryParams: { [key: string]: string } = {
                client_id: impl.config.clientID,
                redirect_uri: redirectURIOnProviderDashboard,
                response_type: "code",
            };

            if (impl.config.scope !== undefined) {
                queryParams.scope = impl.config.scope.join(" ");
            }

            let pkceCodeVerifier: string | undefined = undefined;

            if (impl.config.clientSecret === undefined || impl.config.forcePKCE) {
                const { code_challenge, code_verifier } = pkceChallenge(64);
                queryParams["code_challenge"] = code_challenge;
                queryParams["code_challenge_method"] = "S256";
                pkceCodeVerifier = code_verifier;
            }

            for (const key in impl.config.authorizationEndpointQueryParams) {
                if (impl.config.authorizationEndpointQueryParams[key] === null) {
                    delete queryParams[key];
                } else {
                    queryParams[key] = impl.config.authorizationEndpointQueryParams![key];
                }
            }

            let url = impl.config.authorizationEndpoint!;

            /* Transformation needed for dev keys BEGIN */
            if (isUsingDevelopmentClientId(impl.config.clientID)) {
                queryParams["client_id"] = getActualClientIdFromDevelopmentClientId(impl.config.clientID);
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
            const tokenAPIURL = impl.config.tokenEndpoint!;
            const accessTokenAPIParams: { [key: string]: string } = {
                client_id: impl.config.clientID,
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
            if (isUsingDevelopmentClientId(impl.config.clientID)) {
                accessTokenAPIParams["client_id"] = getActualClientIdFromDevelopmentClientId(impl.config.clientID);
                accessTokenAPIParams["redirect_uri"] = DEV_OAUTH_REDIRECT_URL;
            }
            /* Transformation needed for dev keys END */

            return await doPostRequest(tokenAPIURL, accessTokenAPIParams);
        },

        getUserInfo: async function ({ oAuthTokens }): Promise<UserInfo> {
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
                rawUserInfoFromProvider.fromIdTokenPayload = await verifyIdTokenFromJWKSEndpointAndGetPayload(
                    idToken,
                    impl.config.jwksURI!,
                    {
                        audience: getActualClientIdFromDevelopmentClientId(impl.config.clientID),
                    }
                );

                if (impl.config.validateIdTokenPayload !== undefined) {
                    await impl.config.validateIdTokenPayload({
                        idTokenPayload: rawUserInfoFromProvider.fromIdTokenPayload,
                        clientConfig: impl.config,
                    });
                }
            }

            if (accessToken && impl.config.userInfoEndpoint !== undefined) {
                const headers: { [key: string]: string } = {
                    Authorization: "Bearer " + accessToken,
                };
                const queryParams: { [key: string]: string } = {};

                for (const key in impl.config.userInfoEndpointHeaders) {
                    if (impl.config.userInfoEndpointHeaders[key] === null) {
                        delete headers[key];
                    } else {
                        headers[key] = impl.config.userInfoEndpointHeaders![key].toString();
                    }
                }

                for (const key in impl.config.userInfoEndpointQueryParams) {
                    if (impl.config.userInfoEndpointQueryParams[key] === null) {
                        delete queryParams[key];
                    } else {
                        queryParams[key] = impl.config.userInfoEndpointQueryParams[key];
                    }
                }

                const userInfoFromAccessToken = await doGetRequest(impl.config.userInfoEndpoint, queryParams, headers);
                rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken;
            }

            const userInfoResult = getSupertokensUserInfoResultFromRawUserInfo(impl.config, rawUserInfoFromProvider);

            if (impl.config.tenantId !== undefined && impl.config.tenantId !== DEFAULT_TENANT_ID) {
                userInfoResult.thirdPartyUserId += "|" + impl.config.tenantId;
            }

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
