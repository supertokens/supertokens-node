"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
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
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const jose = __importStar(require("jose"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const OAuth2Client_1 = require("./OAuth2Client");
const __1 = require("../..");
const combinedRemoteJWKSet_1 = require("../../combinedRemoteJWKSet");
function getUpdatedRedirectTo(appInfo, redirectTo) {
    return redirectTo.replace(
        "{apiDomain}",
        appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
    );
    // .replace("oauth2/", "oauth/");
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
                new normalisedURLPath_1.default("/recipe/oauth/auth/requests/login"),
                { loginChallenge: input.challenge },
                input.userContext
            );
            return {
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
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/login/accept`),
                {
                    acr: input.acr,
                    amr: input.amr,
                    context: input.context,
                    extendSessionLifespan: input.extendSessionLifespan,
                    forceSubjectIdentifier: input.forceSubjectIdentifier,
                    identityProviderSessionId: input.identityProviderSessionId,
                    remember: input.remember,
                    rememberFor: input.rememberFor,
                    subject: input.subject,
                },
                {
                    loginChallenge: input.challenge,
                },
                input.userContext
            );
            console.log("acceptLoginRequest resp", resp);
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        rejectLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/login/reject`),
                copyAndCleanRequestBodyInput(input),
                {
                    loginChallenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        getConsentRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth/auth/requests/consent"),
                { consentChallenge: input.challenge },
                input.userContext
            );
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
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/consent/accept`),
                {
                    context: input.context,
                    grantAccessTokenAudience: input.grantAccessTokenAudience,
                    grantScope: input.grantScope,
                    handledAt: input.handledAt,
                    remember: input.remember,
                    rememberFor: input.rememberFor,
                    iss: appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous(),
                    tId: input.tenantId,
                    rsub: input.rsub,
                    sessionHandle: input.sessionHandle,
                },
                {
                    consentChallenge: input.challenge,
                },
                input.userContext
            );
            console.log("acceptConsentRequest resp", {
                body: {
                    context: input.context,
                    grantAccessTokenAudience: input.grantAccessTokenAudience,
                    grantScope: input.grantScope,
                    handledAt: input.handledAt,
                    remember: input.remember,
                    rememberFor: input.rememberFor,
                    iss: appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous(),
                    tId: input.tenantId,
                    rsub: input.rsub,
                    sessionHandle: input.sessionHandle,
                },
                queryParams: {
                    consentChallenge: input.challenge,
                },
                resp,
            });
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        rejectConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/consent/reject`),
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
            console.log("rejectConsentRequest resp", resp);
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        authorization: async function (input) {
            var _a, _b, _c, _d;
            if (input.session !== undefined) {
                if (input.params.prompt === "none") {
                    input.params["st_prompt"] = "none";
                    delete input.params.prompt;
                }
            }
            let payloads;
            if (input.params.client_id === undefined) {
                throw new Error("client_id is required");
            }
            const responseTypes =
                (_b = (_a = input.params.response_type) === null || _a === void 0 ? void 0 : _a.split(" ")) !== null &&
                _b !== void 0
                    ? _b
                    : [];
            if (
                input.session !== undefined &&
                (responseTypes.includes("token") || responseTypes.includes("id_token"))
            ) {
                const clientInfo = await this.getOAuth2Client({
                    clientId: input.params.client_id,
                    userContext: input.userContext,
                });
                if (clientInfo.status === "ERROR") {
                    throw new Error(clientInfo.error);
                }
                const client = clientInfo.client;
                const user = await __1.getUser(input.session.getUserId());
                if (!user) {
                    throw new Error("User not found");
                }
                const idToken = responseTypes.includes("id_token")
                    ? await this.buildIdTokenPayload({
                          user,
                          client,
                          sessionHandle: input.session.getHandle(),
                          scopes: ((_c = input.params.scope) === null || _c === void 0 ? void 0 : _c.split(" ")) || [],
                          userContext: input.userContext,
                      })
                    : undefined;
                const accessToken = responseTypes.includes("token")
                    ? await this.buildAccessTokenPayload({
                          user,
                          client,
                          sessionHandle: input.session.getHandle(),
                          scopes: ((_d = input.params.scope) === null || _d === void 0 ? void 0 : _d.split(" ")) || [],
                          userContext: input.userContext,
                      })
                    : undefined;
                payloads = {
                    idToken,
                    accessToken,
                };
            }
            const resp = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth`),
                {
                    params: input.params,
                    cookies: input.cookies,
                    session: payloads,
                },
                input.userContext
            );
            const redirectTo = getUpdatedRedirectTo(appInfo, resp.redirectTo);
            if (redirectTo === undefined) {
                throw new Error(resp.body);
            }
            const redirectToURL = new URL(redirectTo);
            const consentChallenge = redirectToURL.searchParams.get("consent_challenge");
            if (consentChallenge !== null && input.session !== undefined) {
                const consentRequest = await this.getConsentRequest({
                    challenge: consentChallenge,
                    userContext: input.userContext,
                });
                const consentRes = await this.acceptConsentRequest({
                    userContext: input.userContext,
                    challenge: consentRequest.challenge,
                    grantAccessTokenAudience: consentRequest.requestedAccessTokenAudience,
                    grantScope: consentRequest.requestedScope,
                    tenantId: input.session.getTenantId(),
                    rsub: input.session.getRecipeUserId().getAsString(),
                    sessionHandle: input.session.getHandle(),
                });
                return {
                    redirectTo: consentRes.redirectTo,
                    setCookie: resp.cookies,
                };
            }
            return { redirectTo, setCookie: resp.cookies };
        },
        tokenExchange: async function (input) {
            var _a, _b, _c, _d;
            const body = {
                inputBody: input.body,
                authorizationHeader: input.authorizationHeader,
            };
            body.iss = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            if (input.body.grant_type === "client_credentials") {
                if (input.body.client_id === undefined) {
                    return {
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
                    clientId: input.body.client_id,
                    userContext: input.userContext,
                });
                console.log("clientInfo", clientInfo);
                if (clientInfo.status === "ERROR") {
                    return {
                        statusCode: 400,
                        error: clientInfo.error,
                        errorDescription: clientInfo.errorHint,
                    };
                }
                const client = clientInfo.client;
                const idToken = await this.buildIdTokenPayload({
                    user: undefined,
                    client,
                    sessionHandle: undefined,
                    scopes,
                    userContext: input.userContext,
                });
                const accessTokenPayload = await this.buildAccessTokenPayload({
                    user: undefined,
                    client,
                    sessionHandle: undefined,
                    scopes,
                    userContext: input.userContext,
                });
                body["session"] = {
                    idToken: idToken,
                    accessToken: accessTokenPayload,
                };
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
                console.log("tokenInfo", input.body.refresh_token, tokenInfo);
                if (tokenInfo.active === true) {
                    const sessionHandle = tokenInfo.ext.sessionHandle;
                    const clientInfo = await this.getOAuth2Client({
                        clientId: tokenInfo.client_id,
                        userContext: input.userContext,
                    });
                    if (clientInfo.status === "ERROR") {
                        return {
                            statusCode: 400,
                            error: clientInfo.error,
                            errorDescription: clientInfo.errorHint,
                        };
                    }
                    const client = clientInfo.client;
                    const user = await __1.getUser(tokenInfo.sub);
                    if (!user) {
                        throw new Error("User not found");
                    }
                    const idToken = await this.buildIdTokenPayload({
                        user,
                        client,
                        sessionHandle,
                        scopes,
                        userContext: input.userContext,
                    });
                    const accessTokenPayload = await this.buildAccessTokenPayload({
                        user,
                        client,
                        sessionHandle: sessionHandle,
                        scopes,
                        userContext: input.userContext,
                    });
                    body["session"] = {
                        idToken: idToken,
                        accessToken: accessTokenPayload,
                    };
                }
            }
            if (input.authorizationHeader) {
                body["authorizationHeader"] = input.authorizationHeader;
            }
            console.log("/recipe/oauth/token", body);
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/token`),
                body,
                input.userContext
            );
            if (res.status !== "OK") {
                return {
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.error_description,
                };
            }
            return res;
        },
        getOAuth2Clients: async function (input) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth/clients`),
                Object.assign(Object.assign({}, copyAndCleanRequestBodyInput(input)), {
                    pageToken: input.paginationToken,
                }),
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
                    errorHint: response.body.errorHint,
                };
            }
        },
        getOAuth2Client: async function (input) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth/clients`),
                { clientId: input.clientId },
                {},
                input.userContext
            );
            return {
                status: "OK",
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.body),
            };
            // return {
            //     status: "ERROR",
            //     error: response.body.error,
            //     errorHint: response.body.errorHint,
            // };
        },
        createOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/clients`),
                copyAndCleanRequestBodyInput(input),
                input.userContext
            );
            return {
                status: "OK",
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response),
            };
            // return {
            //     status: "ERROR",
            //     error: response.error,
            //     errorHint: response.errorHint,
            // };
        },
        updateOAuth2Client: async function (input) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/clients`),
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
                    errorHint: response.errorHint,
                };
            }
        },
        deleteOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/clients/remove`),
                { clientId: input.clientId },
                input.userContext
            );
            if (response.status === "OK") {
                return { status: "OK" };
            } else {
                return {
                    status: "ERROR",
                    error: response.error,
                    errorHint: response.errorHint,
                };
            }
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
        validateOAuth2AccessToken: async function (input) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const payload = (await jose.jwtVerify(input.token, combinedRemoteJWKSet_1.getCombinedJWKS())).payload;
            if (payload.stt !== 1) {
                throw new Error("Wrong token type");
            }
            if (
                ((_a = input.requirements) === null || _a === void 0 ? void 0 : _a.clientId) !== undefined &&
                payload.client_id !== input.requirements.clientId
            ) {
                throw new Error("The token doesn't belong to the specified client");
            }
            if (
                ((_b = input.requirements) === null || _b === void 0 ? void 0 : _b.scopes) !== undefined &&
                input.requirements.scopes.some((scope) => !payload.scp.includes(scope))
            ) {
                throw new Error("The token is missing some required scopes");
            }
            const aud =
                payload.aud instanceof Array
                    ? payload.aud
                    : (_d = (_c = payload.aud) === null || _c === void 0 ? void 0 : _c.split(" ")) !== null &&
                      _d !== void 0
                    ? _d
                    : [];
            if (
                ((_e = input.requirements) === null || _e === void 0 ? void 0 : _e.audience) !== undefined &&
                !aud.includes(input.requirements.audience)
            ) {
                throw new Error("The token doesn't belong to the specified audience");
            }
            if (input.checkDatabase) {
                let response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/recipe/oauth/introspect`),
                    {
                        token: input.token,
                        scope:
                            (_h =
                                (_g = (_f = input.requirements) === null || _f === void 0 ? void 0 : _f.scopes) ===
                                    null || _g === void 0
                                    ? void 0
                                    : _g.join(" ")) !== null && _h !== void 0
                                ? _h
                                : undefined,
                    },
                    input.userContext
                );
                if (response.status !== "OK" || response.active !== true) {
                    throw new Error(response.error);
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
                    requestBody.clientId = input.clientId;
                }
                if ("clientSecret" in input && input.clientSecret !== undefined) {
                    requestBody.clientSecret = input.clientSecret;
                }
            }
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/token/revoke`),
                requestBody,
                input.userContext
            );
            if (res.status !== "OK") {
                return {
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.error_description,
                };
            }
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
                    return { active: false };
                }
            }
            // For tokens that passed local validation or if it's a refresh token,
            // validate the token with the database by calling the core introspection endpoint
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/introspect`),
                {
                    token,
                    scope: scopes ? scopes.join(" ") : undefined,
                },
                userContext
            );
            return res;
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
            const resp = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth/sessions/logout`),
                input.params,
                {},
                input.userContext
            );
            const redirectTo = getUpdatedRedirectTo(appInfo, resp.headers.get("Location"));
            if (redirectTo === undefined) {
                throw new Error(resp.body);
            }
            const websiteDomain = appInfo
                .getOrigin({ request: undefined, userContext: input.userContext })
                .getAsStringDangerous();
            const websiteBasePath = appInfo.websiteBasePath.getAsStringDangerous();
            const redirectToURL = new URL(redirectTo);
            const logoutChallenge = redirectToURL.searchParams.get("logout_challenge");
            // CASE 1 (See above notes)
            if (logoutChallenge !== null) {
                // Redirect to the frontend to ask for logout confirmation if there is a valid or expired supertokens session
                if (input.session !== undefined || input.shouldTryRefresh) {
                    return {
                        redirectTo:
                            websiteDomain + websiteBasePath + "/oauth/logout" + `?logoutChallenge=${logoutChallenge}`,
                    };
                } else {
                    // Accept the logout challenge immediately as there is no supertokens session
                    return await this.acceptLogoutRequest({
                        challenge: logoutChallenge,
                        userContext: input.userContext,
                    });
                }
            }
            // CASE 2 or 3 (See above notes)
            // TODO:
            // NOTE: If no post_logout_redirect_uri is provided, Hydra redirects to a fallback page.
            // In this case, we redirect the user to the /auth page.
            if (redirectTo.endsWith("/oauth/fallbacks/logout/callback")) {
                return { redirectTo: `${websiteDomain}${websiteBasePath}` };
            }
            return { redirectTo };
        },
        acceptLogoutRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/logout/accept`),
                {},
                { logout_challenge: input.challenge },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirect_to)
                    // NOTE: This renaming only applies to this endpoint, hence not part of the generic "getUpdatedRedirectTo" function.
                    .replace("/sessions/logout", "/end_session"),
            };
        },
        rejectLogoutRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/logout/reject`),
                {},
                { logout_challenge: input.challenge },
                input.userContext
            );
            if (resp.status != "OK") {
                throw new Error(resp.error);
            }
            return { status: "OK" };
        },
    };
}
exports.default = getRecipeInterface;
