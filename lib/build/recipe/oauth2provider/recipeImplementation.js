"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== "default") __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const jose = __importStar(require("jose"));
const OAuth2Client_1 = require("./OAuth2Client");
const __1 = require("../..");
const combinedRemoteJWKSet_1 = require("../../combinedRemoteJWKSet");
const recipe_1 = __importDefault(require("../session/recipe"));
const recipe_2 = __importDefault(require("../openid/recipe"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("../../utils");
function getUpdatedRedirectTo(appInfo, redirectTo) {
    return redirectTo.replace(
        "{apiDomain}",
        appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
    );
}
function copyAndCleanRequestBodyInput(input) {
    let result = Object.assign({}, input);
    delete result.userContext;
    delete result.tenantId;
    delete result.session;
    return result;
}
function getRecipeInterface(
    querier,
    _config,
    appInfo,
    getDefaultAccessTokenPayload,
    getDefaultIdTokenPayload,
    getDefaultUserInfoPayload
) {
    return {
        getLoginRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                "/recipe/oauth/auth/requests/login",
                { loginChallenge: input.challenge },
                input.userContext
            );
            if (resp.status !== "OK") {
                return {
                    status: "ERROR",
                    statusCode: resp.statusCode,
                    error: resp.error,
                    errorDescription: resp.errorDescription,
                };
            }
            return {
                status: "OK",
                challenge: resp.challenge,
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(resp.client),
                oidcContext: resp.oidcContext,
                requestUrl: resp.requestUrl,
                requestedAccessTokenAudience: resp.requestedAccessTokenAudience,
                requestedScope: resp.requestedScope,
                sessionId: resp.sessionId,
                skip: resp.skip,
                subject: resp.subject,
            };
        },
        acceptLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/login/accept",
                {
                    acr: input.acr,
                    amr: input.amr,
                    context: input.context,
                    extendSessionLifespan: input.extendSessionLifespan,
                    identityProviderSessionId: input.identityProviderSessionId,
                    subject: input.subject,
                },
                {
                    loginChallenge: input.challenge,
                },
                input.userContext
            );
            if (resp.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, resp), { status: "ERROR" });
            }
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
                status: "OK",
            };
        },
        rejectLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/login/reject",
                {
                    error: input.error.error,
                    errorDescription: input.error.errorDescription,
                    statusCode: input.error.statusCode,
                },
                {
                    login_challenge: input.challenge,
                },
                input.userContext
            );
            if (resp.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, resp), { status: "ERROR" });
            }
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
                status: "OK",
            };
        },
        getConsentRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                "/recipe/oauth/auth/requests/consent",
                { consentChallenge: input.challenge },
                input.userContext
            );
            if (resp.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, resp), { status: "ERROR" });
            }
            return {
                acr: resp.acr,
                amr: resp.amr,
                challenge: resp.challenge,
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(resp.client),
                context: resp.context,
                loginChallenge: resp.loginChallenge,
                loginSessionId: resp.loginSessionId,
                oidcContext: resp.oidcContext,
                requestedAccessTokenAudience: resp.requestedAccessTokenAudience,
                requestedScope: resp.requestedScope,
                skip: resp.skip,
                subject: resp.subject,
            };
        },
        acceptConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/consent/accept",
                {
                    context: input.context,
                    grantAccessTokenAudience: input.grantAccessTokenAudience,
                    grantScope: input.grantScope,
                    handledAt: input.handledAt,
                    iss: await recipe_2.default.getIssuer(input.userContext),
                    tId: input.tenantId,
                    rsub: input.rsub,
                    sessionHandle: input.sessionHandle,
                    initialAccessTokenPayload: input.initialAccessTokenPayload,
                    initialIdTokenPayload: input.initialIdTokenPayload,
                },
                {
                    consentChallenge: input.challenge,
                },
                input.userContext
            );
            if (resp.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, resp), { status: "ERROR" });
            }
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
                status: "OK",
            };
        },
        rejectConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/consent/reject",
                {
                    error: input.error.error,
                    errorDescription: input.error.errorDescription,
                    statusCode: input.error.statusCode,
                },
                {
                    consentChallenge: input.challenge,
                },
                input.userContext
            );
            if (resp.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, resp), { status: "ERROR" });
            }
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
                status: "OK",
            };
        },
        authorization: async function (input) {
            var _a, _b, _c, _d, _e;
            // we handle this in the backend SDK level
            if (input.params.prompt === "none") {
                input.params["st_prompt"] = "none";
                delete input.params.prompt;
            }
            let payloads;
            if (input.params.client_id === undefined || typeof input.params.client_id !== "string") {
                return {
                    status: "ERROR",
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "client_id is required and must be a string",
                };
            }
            const scopes = await this.getRequestedScopes({
                scopeParam: ((_a = input.params.scope) === null || _a === void 0 ? void 0 : _a.split(" ")) || [],
                clientId: input.params.client_id,
                recipeUserId: (_b = input.session) === null || _b === void 0 ? void 0 : _b.getRecipeUserId(),
                sessionHandle: (_c = input.session) === null || _c === void 0 ? void 0 : _c.getHandle(),
                userContext: input.userContext,
            });
            const responseTypes =
                (_e = (_d = input.params.response_type) === null || _d === void 0 ? void 0 : _d.split(" ")) !== null &&
                _e !== void 0
                    ? _e
                    : [];
            if (input.session !== undefined) {
                const clientInfo = await this.getOAuth2Client({
                    clientId: input.params.client_id,
                    userContext: input.userContext,
                });
                if (clientInfo.status === "ERROR") {
                    return {
                        status: "ERROR",
                        statusCode: 400,
                        error: clientInfo.error,
                        errorDescription: clientInfo.errorDescription,
                    };
                }
                const client = clientInfo.client;
                const user = await (0, __1.getUser)(input.session.getUserId());
                if (!user) {
                    return {
                        status: "ERROR",
                        statusCode: 400,
                        error: "invalid_request",
                        errorDescription: "User deleted",
                    };
                }
                // These default to an empty objects, because we want to keep them as a required input
                // but they'll not be actually used in the flows where we are not building them.
                const idToken =
                    scopes.includes("openid") && (responseTypes.includes("id_token") || responseTypes.includes("code"))
                        ? await this.buildIdTokenPayload({
                              user,
                              client,
                              sessionHandle: input.session.getHandle(),
                              scopes,
                              userContext: input.userContext,
                          })
                        : {};
                const accessToken =
                    responseTypes.includes("token") || responseTypes.includes("code")
                        ? await this.buildAccessTokenPayload({
                              user,
                              client,
                              sessionHandle: input.session.getHandle(),
                              scopes,
                              userContext: input.userContext,
                          })
                        : {};
                payloads = {
                    idToken,
                    accessToken,
                };
            }
            const resp = await querier.sendPostRequest(
                "/recipe/oauth/auth",
                {
                    params: Object.assign(Object.assign({}, input.params), { scope: scopes.join(" ") }),
                    iss: await recipe_2.default.getIssuer(input.userContext),
                    cookies: input.cookies,
                    session: payloads,
                },
                input.userContext
            );
            if (resp.status === "CLIENT_NOT_FOUND_ERROR") {
                return {
                    status: "ERROR",
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "The provided client_id is not valid",
                };
            }
            if (resp.status !== "OK") {
                return {
                    status: "ERROR",
                    statusCode: resp.statusCode,
                    error: resp.error,
                    errorDescription: resp.errorDescription,
                };
            }
            const redirectTo = getUpdatedRedirectTo(appInfo, resp.redirectTo);
            if (redirectTo === undefined) {
                throw new Error("Got redirectTo as undefined, cannot continue");
            }
            const redirectToURL = new URL(redirectTo);
            const consentChallenge = redirectToURL.searchParams.get("consent_challenge");
            if (consentChallenge !== null && input.session !== undefined) {
                const consentRequest = await this.getConsentRequest({
                    challenge: consentChallenge,
                    userContext: input.userContext,
                });
                if ("error" in consentRequest) {
                    return consentRequest;
                }
                const consentRes = await this.acceptConsentRequest({
                    userContext: input.userContext,
                    challenge: consentRequest.challenge,
                    grantAccessTokenAudience: consentRequest.requestedAccessTokenAudience,
                    grantScope: consentRequest.requestedScope,
                    tenantId: input.session.getTenantId(),
                    rsub: input.session.getRecipeUserId().getAsString(),
                    sessionHandle: input.session.getHandle(),
                    initialAccessTokenPayload: payloads === null || payloads === void 0 ? void 0 : payloads.accessToken,
                    initialIdTokenPayload: payloads === null || payloads === void 0 ? void 0 : payloads.idToken,
                });
                if ("error" in consentRes) {
                    return consentRes;
                }
                return {
                    redirectTo: consentRes.redirectTo,
                    cookies: resp.cookies,
                };
            }
            return { redirectTo, cookies: resp.cookies };
        },
        tokenExchange: async function (input) {
            var _a, _b, _c, _d;
            const body = {
                inputBody: input.body,
                authorizationHeader: input.authorizationHeader,
            };
            body.iss = await recipe_2.default.getIssuer(input.userContext);
            if (input.body.grant_type === "password") {
                return {
                    status: "ERROR",
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "Unsupported grant type: password",
                };
            }
            if (input.body.grant_type === "client_credentials") {
                let clientId =
                    input.authorizationHeader !== undefined
                        ? (0, utils_1.decodeBase64)(input.authorizationHeader.replace(/^Basic /, "").trim()).split(
                              ":"
                          )[0]
                        : input.body.client_id;
                if (clientId === undefined) {
                    return {
                        status: "ERROR",
                        statusCode: 400,
                        error: "invalid_request",
                        errorDescription: "client_id is required",
                    };
                }
                const scopes =
                    (_b = (_a = input.body.scope) === null || _a === void 0 ? void 0 : _a.split(" ")) !== null &&
                    _b !== void 0
                        ? _b
                        : [];
                const clientInfo = await this.getOAuth2Client({
                    clientId,
                    userContext: input.userContext,
                });
                if (clientInfo.status === "ERROR") {
                    return {
                        status: "ERROR",
                        statusCode: 400,
                        error: clientInfo.error,
                        errorDescription: clientInfo.errorDescription,
                    };
                }
                const client = clientInfo.client;
                body["id_token"] = await this.buildIdTokenPayload({
                    user: undefined,
                    client,
                    sessionHandle: undefined,
                    scopes,
                    userContext: input.userContext,
                });
                body["access_token"] = await this.buildAccessTokenPayload({
                    user: undefined,
                    client,
                    sessionHandle: undefined,
                    scopes,
                    userContext: input.userContext,
                });
            }
            if (input.body.grant_type === "refresh_token") {
                const scopes =
                    (_d = (_c = input.body.scope) === null || _c === void 0 ? void 0 : _c.split(" ")) !== null &&
                    _d !== void 0
                        ? _d
                        : [];
                const tokenInfo = await this.introspectToken({
                    token: input.body.refresh_token,
                    scopes,
                    userContext: input.userContext,
                });
                if (tokenInfo.status === "ERROR") {
                    return tokenInfo;
                }
                if (tokenInfo.active === true) {
                    const sessionHandle = tokenInfo.sessionHandle;
                    const clientInfo = await this.getOAuth2Client({
                        clientId: tokenInfo.client_id,
                        userContext: input.userContext,
                    });
                    if (clientInfo.status === "ERROR") {
                        return {
                            status: "ERROR",
                            statusCode: 400,
                            error: clientInfo.error,
                            errorDescription: clientInfo.errorDescription,
                        };
                    }
                    const client = clientInfo.client;
                    const user = await (0, __1.getUser)(tokenInfo.sub);
                    if (!user) {
                        return {
                            status: "ERROR",
                            statusCode: 400,
                            error: "invalid_request",
                            errorDescription: "User not found",
                        };
                    }
                    body["id_token"] = await this.buildIdTokenPayload({
                        user,
                        client,
                        sessionHandle,
                        scopes,
                        userContext: input.userContext,
                    });
                    body["access_token"] = await this.buildAccessTokenPayload({
                        user,
                        client,
                        sessionHandle: sessionHandle,
                        scopes,
                        userContext: input.userContext,
                    });
                }
            }
            if (input.authorizationHeader) {
                body["authorizationHeader"] = input.authorizationHeader;
            }
            const res = await querier.sendPostRequest("/recipe/oauth/token", body, input.userContext);
            if (res.status === "CLIENT_NOT_FOUND_ERROR") {
                return {
                    status: "ERROR",
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "client_id not found",
                };
            }
            if (res.status !== "OK") {
                return {
                    status: "ERROR",
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.errorDescription,
                };
            }
            return res;
        },
        getOAuth2Clients: async function (input) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                "/recipe/oauth/clients/list",
                {
                    pageSize: input.pageSize,
                    clientName: input.clientName,
                    pageToken: input.paginationToken,
                },
                {},
                input.userContext
            );
            if (response.body.status === "OK") {
                return {
                    status: "OK",
                    clients: response.body.clients.map((client) => OAuth2Client_1.OAuth2Client.fromAPIResponse(client)),
                    nextPaginationToken: response.body.nextPaginationToken,
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.body.error,
                    errorDescription: response.body.errorDescription,
                };
            }
        },
        getOAuth2Client: async function (input) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                "/recipe/oauth/clients",
                { clientId: input.clientId },
                {},
                input.userContext
            );
            if (response.body.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.body),
                };
            } else if (response.body.status === "CLIENT_NOT_FOUND_ERROR") {
                return {
                    status: "ERROR",
                    error: "invalid_request",
                    errorDescription: "The provided client_id is not valid or unknown",
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.body.error,
                    errorDescription: response.body.errorDescription,
                };
            }
        },
        createOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                "/recipe/oauth/clients",
                copyAndCleanRequestBodyInput(input),
                input.userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.error,
                    errorDescription: response.errorDescription,
                };
            }
        },
        updateOAuth2Client: async function (input) {
            let response = await querier.sendPutRequest(
                "/recipe/oauth/clients",
                copyAndCleanRequestBodyInput(input),
                { clientId: input.clientId },
                input.userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.error,
                    errorDescription: response.errorDescription,
                };
            }
        },
        deleteOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                "/recipe/oauth/clients/remove",
                { clientId: input.clientId },
                input.userContext
            );
            if (response.status === "OK") {
                return { status: "OK" };
            } else {
                return {
                    status: "ERROR",
                    error: response.error,
                    errorDescription: response.errorDescription,
                };
            }
        },
        getRequestedScopes: async function (input) {
            return input.scopeParam;
        },
        buildAccessTokenPayload: async function (input) {
            if (input.user === undefined || input.sessionHandle === undefined) {
                return {};
            }
            return getDefaultAccessTokenPayload(input.user, input.scopes, input.sessionHandle, input.userContext);
        },
        buildIdTokenPayload: async function (input) {
            if (input.user === undefined || input.sessionHandle === undefined) {
                return {};
            }
            return getDefaultIdTokenPayload(input.user, input.scopes, input.sessionHandle, input.userContext);
        },
        buildUserInfo: async function ({ user, accessTokenPayload, scopes, tenantId, userContext }) {
            return getDefaultUserInfoPayload(user, accessTokenPayload, scopes, tenantId, userContext);
        },
        getFrontendRedirectionURL: async function (input) {
            const websiteDomain = appInfo
                .getOrigin({ request: undefined, userContext: input.userContext })
                .getAsStringDangerous();
            const websiteBasePath = appInfo.websiteBasePath.getAsStringDangerous();
            if (input.type === "login") {
                const queryParams = new URLSearchParams({
                    loginChallenge: input.loginChallenge,
                });
                if (input.tenantId !== undefined && input.tenantId !== constants_1.DEFAULT_TENANT_ID) {
                    queryParams.set("tenantId", input.tenantId);
                }
                if (input.hint !== undefined) {
                    queryParams.set("hint", input.hint);
                }
                if (input.forceFreshAuth) {
                    queryParams.set("forceFreshAuth", "true");
                }
                return `${websiteDomain}${websiteBasePath}?${queryParams.toString()}`;
            } else if (input.type === "try-refresh") {
                return `${websiteDomain}${websiteBasePath}/try-refresh?loginChallenge=${input.loginChallenge}`;
            } else if (input.type === "post-logout-fallback") {
                return `${websiteDomain}${websiteBasePath}`;
            } else if (input.type === "logout-confirmation") {
                return `${websiteDomain}${websiteBasePath}/oauth/logout?logoutChallenge=${input.logoutChallenge}`;
            }
            throw new Error("This should never happen: invalid type passed to getFrontendRedirectionURL");
        },
        validateOAuth2AccessToken: async function (input) {
            var _a, _b, _c;
            const payload = (
                await jose.jwtVerify(
                    input.token,
                    (0, combinedRemoteJWKSet_1.getCombinedJWKS)(recipe_1.default.getInstanceOrThrowError().config)
                )
            ).payload;
            if (payload.stt !== 1) {
                throw new Error("Wrong token type");
            }
            if (
                ((_a = input.requirements) === null || _a === void 0 ? void 0 : _a.clientId) !== undefined &&
                payload.client_id !== input.requirements.clientId
            ) {
                throw new Error(
                    `The token doesn't belong to the specified client (${input.requirements.clientId} !== ${payload.client_id})`
                );
            }
            if (
                ((_b = input.requirements) === null || _b === void 0 ? void 0 : _b.scopes) !== undefined &&
                input.requirements.scopes.some((scope) => !payload.scp.includes(scope))
            ) {
                throw new Error("The token is missing some required scopes");
            }
            const aud = payload.aud instanceof Array ? payload.aud : [payload.aud];
            if (
                ((_c = input.requirements) === null || _c === void 0 ? void 0 : _c.audience) !== undefined &&
                !aud.includes(input.requirements.audience)
            ) {
                throw new Error("The token doesn't belong to the specified audience");
            }
            if (input.checkDatabase) {
                let response = await querier.sendPostRequest(
                    "/recipe/oauth/introspect",
                    {
                        token: input.token,
                    },
                    input.userContext
                );
                if (response.status === "OAUTH_ERROR") {
                    throw new Error("The token is expired, invalid or has been revoked");
                }
                if (response.active !== true) {
                    throw new Error("The token is expired, invalid or has been revoked");
                }
            }
            return { status: "OK", payload: payload };
        },
        revokeToken: async function (input) {
            const requestBody = {
                token: input.token,
            };
            if ("authorizationHeader" in input && input.authorizationHeader !== undefined) {
                requestBody.authorizationHeader = input.authorizationHeader;
            } else {
                if ("clientId" in input && input.clientId !== undefined) {
                    requestBody.client_id = input.clientId;
                }
                if ("clientSecret" in input && input.clientSecret !== undefined) {
                    requestBody.client_secret = input.clientSecret;
                }
            }
            const res = await querier.sendPostRequest("/recipe/oauth/token/revoke", requestBody, input.userContext);
            if (res.status !== "OK") {
                return {
                    status: "ERROR",
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.errorDescription,
                };
            }
            return { status: "OK" };
        },
        revokeTokensBySessionHandle: async function (input) {
            await querier.sendPostRequest(
                "/recipe/oauth/session/revoke",
                { sessionHandle: input.sessionHandle },
                input.userContext
            );
            return { status: "OK" };
        },
        revokeTokensByClientId: async function (input) {
            await querier.sendPostRequest(
                "/recipe/oauth/tokens/revoke",
                { client_id: input.clientId },
                input.userContext
            );
            return { status: "OK" };
        },
        introspectToken: async function ({ token, scopes, userContext }) {
            // Determine if the token is an access token by checking if it doesn't start with "st_rt"
            const isAccessToken = !token.startsWith("st_rt");
            // Attempt to validate the access token locally
            // If it fails, the token is not active, and we return early
            if (isAccessToken) {
                try {
                    await this.validateOAuth2AccessToken({
                        token,
                        requirements: { scopes },
                        checkDatabase: false,
                        userContext,
                    });
                } catch (error) {
                    return {
                        active: false,
                        status: "OK",
                    };
                }
            }
            // For tokens that passed local validation or if it's a refresh token,
            // validate the token with the database by calling the core introspection endpoint
            const res = await querier.sendPostRequest(
                "/recipe/oauth/introspect",
                {
                    token,
                    scope: scopes ? scopes.join(" ") : undefined,
                },
                userContext
            );
            if (res.status === "OAUTH_ERROR") {
                return Object.assign(Object.assign({}, res), { status: "ERROR" });
            }
            return Object.assign(Object.assign({}, res), { status: "OK" });
        },
        endSession: async function (input) {
            /**
             * NOTE: The API response has 3 possible cases:
             *
             * CASE 1: `end_session` request with a valid `id_token_hint`
             *        - Redirects to `/oauth/logout` with a `logout_challenge`.
             *
             * CASE 2: `end_session` request with an already logged out `id_token_hint`
             *        - Redirects to the `post_logout_redirect_uri` or the default logout fallback page.
             *
             * CASE 3: `end_session` request with a `logout_verifier` (after accepting the logout request)
             *        - Redirects to the `post_logout_redirect_uri` or the default logout fallback page.
             */
            const resp = await querier.sendGetRequest(
                "/recipe/oauth/sessions/logout",
                {
                    clientId: input.params.client_id,
                    idTokenHint: input.params.id_token_hint,
                    postLogoutRedirectUri: input.params.post_logout_redirect_uri,
                    state: input.params.state,
                    logoutVerifier: input.params.logout_verifier,
                },
                input.userContext
            );
            if ("error" in resp) {
                return {
                    status: "ERROR",
                    statusCode: resp.statusCode,
                    error: resp.error,
                    errorDescription: resp.errorDescription,
                };
            }
            let redirectTo = getUpdatedRedirectTo(appInfo, resp.redirectTo);
            const initialRedirectToURL = new URL(redirectTo);
            const logoutChallenge = initialRedirectToURL.searchParams.get("logout_challenge");
            // CASE 1 (See above notes)
            if (logoutChallenge !== null) {
                // Redirect to the frontend to ask for logout confirmation if there is a valid or expired supertokens session
                if (input.session !== undefined || input.shouldTryRefresh) {
                    return {
                        redirectTo: await this.getFrontendRedirectionURL({
                            type: "logout-confirmation",
                            logoutChallenge,
                            userContext: input.userContext,
                        }),
                    };
                } else {
                    // Accept the logout challenge immediately as there is no supertokens session
                    const acceptLogoutResponse = await this.acceptLogoutRequest({
                        challenge: logoutChallenge,
                        userContext: input.userContext,
                    });
                    if ("error" in acceptLogoutResponse) {
                        return acceptLogoutResponse;
                    }
                    return { redirectTo: acceptLogoutResponse.redirectTo };
                }
            }
            // CASE 2 or 3 (See above notes)
            // NOTE: If no post_logout_redirect_uri is provided, Hydra redirects to a fallback page.
            // In this case, we redirect the user to the /auth page.
            if (redirectTo.endsWith("/fallbacks/logout/callback")) {
                return {
                    redirectTo: await this.getFrontendRedirectionURL({
                        type: "post-logout-fallback",
                        userContext: input.userContext,
                    }),
                };
            }
            return { redirectTo };
        },
        acceptLogoutRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/logout/accept",
                { challenge: input.challenge },
                {},
                input.userContext
            );
            if (resp.status !== "OK") {
                return {
                    status: "ERROR",
                    statusCode: resp.statusCode,
                    error: resp.error,
                    errorDescription: resp.errorDescription,
                };
            }
            const redirectTo = getUpdatedRedirectTo(appInfo, resp.redirectTo);
            if (redirectTo.endsWith("/fallbacks/logout/callback")) {
                return {
                    redirectTo: await this.getFrontendRedirectionURL({
                        type: "post-logout-fallback",
                        userContext: input.userContext,
                    }),
                };
            }
            return { redirectTo };
        },
        rejectLogoutRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                "/recipe/oauth/auth/requests/logout/reject",
                {},
                { challenge: input.challenge },
                input.userContext
            );
            if (resp.status != "OK") {
                throw new Error(resp.error);
            }
            return { status: "OK" };
        },
    };
}
