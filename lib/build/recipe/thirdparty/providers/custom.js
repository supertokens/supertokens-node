"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_OAUTH_REDIRECT_URL = void 0;
exports.isUsingDevelopmentClientId = isUsingDevelopmentClientId;
exports.getActualClientIdFromDevelopmentClientId = getActualClientIdFromDevelopmentClientId;
exports.default = NewProvider;
const thirdpartyUtils_1 = require("../../../thirdpartyUtils");
const utils_1 = require("../../../utils");
const pkce_challenge_1 = __importDefault(require("pkce-challenge"));
const configUtils_1 = require("./configUtils");
const jose_1 = require("jose");
const logger_1 = require("../../../logger");
const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
exports.DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";
// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com", // google
    "467101b197249757c71f", // github
];
const DEV_KEY_IDENTIFIER = "4398792-";
function isUsingDevelopmentClientId(client_id) {
    return client_id.startsWith(DEV_KEY_IDENTIFIER) || DEV_OAUTH_CLIENT_IDS.includes(client_id);
}
function getActualClientIdFromDevelopmentClientId(client_id) {
    if (client_id.startsWith(DEV_KEY_IDENTIFIER)) {
        return client_id.split(DEV_KEY_IDENTIFIER)[1];
    }
    return client_id;
}
function accessField(obj, key) {
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
function getSupertokensUserInfoResultFromRawUserInfo(config, rawUserInfoResponse) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    let thirdPartyUserId = "";
    if (
        ((_b = (_a = config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI) === null ||
        _b === void 0
            ? void 0
            : _b.userId) !== undefined
    ) {
        const userId = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap.fromUserInfoAPI.userId);
        if (userId !== undefined) {
            thirdPartyUserId = userId;
        }
    }
    if (
        ((_d = (_c = config.userInfoMap) === null || _c === void 0 ? void 0 : _c.fromIdTokenPayload) === null ||
        _d === void 0
            ? void 0
            : _d.userId) !== undefined
    ) {
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
    const result = {
        thirdPartyUserId,
    };
    let email = "";
    if (
        ((_f = (_e = config.userInfoMap) === null || _e === void 0 ? void 0 : _e.fromUserInfoAPI) === null ||
        _f === void 0
            ? void 0
            : _f.email) !== undefined
    ) {
        const emailVal = accessField(rawUserInfoResponse.fromUserInfoAPI, config.userInfoMap.fromUserInfoAPI.email);
        if (emailVal !== undefined) {
            email = emailVal;
        }
    }
    if (
        ((_h = (_g = config.userInfoMap) === null || _g === void 0 ? void 0 : _g.fromIdTokenPayload) === null ||
        _h === void 0
            ? void 0
            : _h.email) !== undefined
    ) {
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
        if (
            ((_k = (_j = config.userInfoMap) === null || _j === void 0 ? void 0 : _j.fromUserInfoAPI) === null ||
            _k === void 0
                ? void 0
                : _k.emailVerified) !== undefined
        ) {
            const emailVerifiedVal = accessField(
                rawUserInfoResponse.fromUserInfoAPI,
                config.userInfoMap.fromUserInfoAPI.emailVerified
            );
            result.email.isVerified =
                emailVerifiedVal === true ||
                (typeof emailVerifiedVal === "string" && emailVerifiedVal.toLowerCase() === "true");
        }
        if (
            ((_m = (_l = config.userInfoMap) === null || _l === void 0 ? void 0 : _l.fromIdTokenPayload) === null ||
            _m === void 0
                ? void 0
                : _m.emailVerified) !== undefined
        ) {
            const emailVerifiedVal = accessField(
                rawUserInfoResponse.fromIdTokenPayload,
                config.userInfoMap.fromIdTokenPayload.emailVerified
            );
            result.email.isVerified = emailVerifiedVal === true || emailVerifiedVal === "true";
        }
    }
    return result;
}
function NewProvider(input) {
    var _a, _b;
    // These are safe defaults common to most providers. Each provider implementations override these
    // as necessary
    input.config.userInfoMap = {
        fromIdTokenPayload: Object.assign(
            { userId: "sub", email: "email", emailVerified: "email_verified" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromIdTokenPayload
        ),
        fromUserInfoAPI: Object.assign(
            { userId: "sub", email: "email", emailVerified: "email_verified" },
            (_b = input.config.userInfoMap) === null || _b === void 0 ? void 0 : _b.fromUserInfoAPI
        ),
    };
    if (input.config.generateFakeEmail === undefined) {
        input.config.generateFakeEmail = async function ({ thirdPartyUserId }) {
            return `${thirdPartyUserId}.${input.config.thirdPartyId}@stfakeemail.supertokens.com`;
        };
    }
    let jwks;
    let impl = {
        id: input.config.thirdPartyId,
        config: Object.assign(Object.assign({}, input.config), { clientId: "temp" }),
        getConfigForClientType: async function ({ clientType }) {
            if (clientType === undefined) {
                if (input.config.clients === undefined || input.config.clients.length !== 1) {
                    throw new Error("please provide exactly one client config or pass clientType or tenantId");
                }
                return (0, configUtils_1.getProviderConfigForClient)(input.config, input.config.clients[0]);
            }
            if (input.config.clients !== undefined) {
                for (const client of input.config.clients) {
                    if (client.clientType === clientType) {
                        return (0, configUtils_1.getProviderConfigForClient)(input.config, client);
                    }
                }
            }
            throw new Error(`Could not find client config for clientType: ${clientType}`);
        },
        getAuthorisationRedirectURL: async function ({ redirectURIOnProviderDashboard }) {
            var _a;
            const queryParams = {
                client_id: impl.config.clientId,
                redirect_uri: redirectURIOnProviderDashboard,
                response_type: "code",
            };
            if (impl.config.scope !== undefined) {
                queryParams.scope = impl.config.scope.join(" ");
            }
            let pkceCodeVerifier = undefined;
            // Check if the OIDC response had specified PKCE to be used.
            // Reference: https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
            //
            // Generally, we should try to use the best method supported by the provider.
            // However, we will only use the S256 method if it is present and ignore otherwise,
            // i.e. if `plain` is present etc.
            const isS256MethodSupported =
                (_a = impl.config.codeChallengeMethodsSupported) === null || _a === void 0
                    ? void 0
                    : _a.includes("S256");
            if (impl.config.clientSecret === undefined || impl.config.forcePKCE || isS256MethodSupported) {
                const { code_challenge, code_verifier } = (0, pkce_challenge_1.default)(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128
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
            let url = impl.config.authorizationEndpoint;
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
            const accessTokenAPIParams = {
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
                accessTokenAPIParams["redirect_uri"] = exports.DEV_OAUTH_REDIRECT_URL;
            }
            /* Transformation needed for dev keys END */
            const tokenResponse = await (0, thirdpartyUtils_1.doPostRequest)(tokenAPIURL, accessTokenAPIParams);
            if (tokenResponse.status >= 400) {
                (0, logger_1.logDebugMessage)(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
            }
            return tokenResponse.jsonResponse;
        },
        getUserInfo: async function ({ oAuthTokens, userContext }) {
            const accessToken = oAuthTokens["access_token"];
            const idToken = oAuthTokens["id_token"];
            let rawUserInfoFromProvider = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };
            if (idToken && impl.config.jwksURI !== undefined) {
                if (jwks === undefined) {
                    jwks = (0, jose_1.createRemoteJWKSet)(new URL(impl.config.jwksURI));
                }
                rawUserInfoFromProvider.fromIdTokenPayload = await (0,
                thirdpartyUtils_1.verifyIdTokenFromJWKSEndpointAndGetPayload)(idToken, jwks, {
                    audience: getActualClientIdFromDevelopmentClientId(impl.config.clientId),
                });
                if (impl.config.validateIdTokenPayload !== undefined) {
                    await impl.config.validateIdTokenPayload({
                        idTokenPayload: rawUserInfoFromProvider.fromIdTokenPayload,
                        clientConfig: impl.config,
                        userContext: (0, utils_1.getUserContext)(userContext),
                    });
                }
            }
            if (impl.config.validateAccessToken !== undefined && accessToken !== undefined) {
                await impl.config.validateAccessToken({
                    accessToken: accessToken,
                    clientConfig: impl.config,
                    userContext: (0, utils_1.getUserContext)(userContext),
                });
            }
            if (accessToken && impl.config.userInfoEndpoint !== undefined) {
                const headers = {
                    Authorization: "Bearer " + accessToken,
                };
                const queryParams = {};
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
                const userInfoFromAccessToken = await (0, thirdpartyUtils_1.doGetRequest)(
                    impl.config.userInfoEndpoint,
                    queryParams,
                    headers
                );
                if (userInfoFromAccessToken.status >= 400) {
                    (0, logger_1.logDebugMessage)(
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
