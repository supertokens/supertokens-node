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
const querier_1 = require("../../querier");
const utils_1 = require("../../utils");
const OAuth2Client_1 = require("./OAuth2Client");
const __1 = require("../..");
const combinedRemoteJWKSet_1 = require("../../combinedRemoteJWKSet");
const session_1 = require("../session");
function getUpdatedRedirectTo(appInfo, redirectTo) {
    if (redirectTo.includes("{apiDomain}")) {
        return redirectTo.replace(
            "{apiDomain}",
            appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
        );
    }
    // TODO: Remove this core changes are done
    return redirectTo
        .replace(
            querier_1.hydraPubDomain,
            appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
        )
        .replace("oauth2/", "oauth/");
}
function getRecipeInterface(
    querier,
    _config,
    appInfo,
    getDefaultAccessTokenPayload,
    getDefaultIdTokenPayload,
    getDefaultUserInfoPayload,
    saveTokensForHook
) {
    return {
        getLoginRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth/auth/requests/login"),
                { challenge: input.challenge },
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
                    challenge: input.challenge,
                },
                input.userContext
            );
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        rejectLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/login/reject`),
                {
                    error: input.error.error,
                    error_description: input.error.errorDescription,
                    status_code: input.error.statusCode,
                },
                {
                    login_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        getConsentRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth/auth/requests/consent"),
                { challenge: input.challenge },
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
                    session: input.session,
                },
                {
                    challenge: input.challenge,
                },
                input.userContext
            );
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        rejectConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth/requests/consent/reject`),
                {
                    error: input.error.error,
                    error_description: input.error.errorDescription,
                    status_code: input.error.statusCode,
                },
                {
                    consentChallenge: input.challenge,
                },
                input.userContext
            );
            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        authorization: async function (input) {
            var _a, _b;
            if (input.session !== undefined) {
                if (input.params.prompt === "none") {
                    input.params["st_prompt"] = "none";
                    delete input.params.prompt;
                }
            }
            const resp = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/auth`),
                {
                    params: input.params,
                    cookies: `${input.cookies}`,
                },
                // {
                //     // TODO: if session is not set also clear the oauth2 cookie
                //     Cookie: `${input.cookies}`,
                // },
                input.userContext
            );
            if (resp.status === "OK") {
                const redirectTo = resp.redirectTo;
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
                    const user = await __1.getUser(input.session.getUserId());
                    if (!user) {
                        throw new Error("Should not happen");
                    }
                    const idToken = await this.buildIdTokenPayload({
                        user,
                        client: consentRequest.client,
                        sessionHandle: input.session.getHandle(),
                        scopes: consentRequest.requestedScope || [],
                        userContext: input.userContext,
                    });
                    const accessTokenPayload = await this.buildAccessTokenPayload({
                        user,
                        client: consentRequest.client,
                        sessionHandle: input.session.getHandle(),
                        scopes: consentRequest.requestedScope || [],
                        userContext: input.userContext,
                    });
                    const sessionInfo = await session_1.getSessionInformation(input.session.getHandle());
                    if (!sessionInfo) {
                        throw new Error("Session not found");
                    }
                    const consentRes = await this.acceptConsentRequest(
                        Object.assign(Object.assign({}, input), {
                            challenge: consentRequest.challenge,
                            grantAccessTokenAudience: consentRequest.requestedAccessTokenAudience,
                            grantScope: consentRequest.requestedScope,
                            remember: true,
                            session: {
                                id_token: idToken,
                                access_token: accessTokenPayload,
                            },
                            handledAt: new Date(sessionInfo.timeCreated).toISOString(),
                        })
                    );
                    return {
                        redirectTo: consentRes.redirectTo,
                        setCookie: (_a = resp.cookies) !== null && _a !== void 0 ? _a : undefined,
                    };
                }
                return { redirectTo, setCookie: (_b = resp.cookies) !== null && _b !== void 0 ? _b : undefined };
            }
            return resp;
        },
        tokenExchange: async function (input) {
            var _a, _b;
            const body = {};
            for (const key in input.body) {
                body[key] = input.body[key];
            }
            if (input.body.grant_type === "refresh_token") {
                const scopes =
                    (_b = (_a = input.body.scope) === null || _a === void 0 ? void 0 : _a.split(" ")) !== null &&
                    _b !== void 0
                        ? _b
                        : [];
                const tokenInfo = await this.introspectToken({
                    token: input.body.refresh_token,
                    scopes,
                    userContext: input.userContext,
                });
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
                        sessionHandle: sessionHandle,
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
                        id_token: idToken,
                        access_token: accessTokenPayload,
                    };
                    saveTokensForHook(sessionHandle, idToken, accessTokenPayload);
                }
            }
            if (input.authorizationHeader) {
                body["authorizationHeader"] = input.authorizationHeader;
            }
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth/token`),
                { body, iss: await this.getIssuer({ userContext: input.userContext }) },
                input.userContext
            );
            if (res.status !== "OK") {
                return {
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.errorDescription,
                };
            }
            return res;
        },
        getOAuth2Clients: async function (input) {
            var _a;
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                Object.assign(Object.assign({}, utils_1.transformObjectKeys(input, "snake-case")), {
                    page_token: input.paginationToken,
                }),
                {},
                input.userContext
            );
            if (response.body.status === "OK") {
                // Pagination info is in the Link header, containing comma-separated links:
                // "first", "next" (if applicable).
                // Example: Link: </admin/clients?page_size=5&page_token=token1>; rel="first", </admin/clients?page_size=5&page_token=token2>; rel="next"
                // We parse the nextPaginationToken from the Link header using RegExp
                let nextPaginationToken;
                const linkHeader = (_a = response.headers.get("link")) !== null && _a !== void 0 ? _a : "";
                const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextLinkMatch) {
                    const url = nextLinkMatch[1];
                    const urlParams = new URLSearchParams(url.split("?")[1]);
                    nextPaginationToken = urlParams.get("page_token");
                }
                return {
                    status: "OK",
                    clients: response.body.data.map((client) => OAuth2Client_1.OAuth2Client.fromAPIResponse(client)),
                    nextPaginationToken,
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.body.data.error,
                    errorHint: response.body.data.errorHint,
                };
            }
        },
        getOAuth2Client: async function (input) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                {},
                {},
                input.userContext
            );
            if (response.body.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.body.data),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.body.data.error,
                    errorHint: response.body.data.errorHint,
                };
            }
        },
        createOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                Object.assign(Object.assign({}, utils_1.transformObjectKeys(input, "snake-case")), {
                    // TODO: these defaults should be set/enforced on the core side
                    access_token_strategy: "jwt",
                    skip_consent: true,
                    subject_type: "public",
                }),
                input.userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.data),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        updateOAuth2Client: async function (input) {
            // We convert the input into an array of "replace" operations
            const requestBody = Object.entries(input).reduce((result, [key, value]) => {
                result.push({
                    from: `/${utils_1.toSnakeCase(key)}`,
                    op: "replace",
                    path: `/${utils_1.toSnakeCase(key)}`,
                    value,
                });
                return result;
            }, []);
            let response = await querier.sendPatchRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                requestBody,
                input.userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.data),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        deleteOAuth2Client: async function (input) {
            let response = await querier.sendDeleteRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                undefined,
                undefined,
                input.userContext
            );
            if (response.status === "OK") {
                return { status: "OK" };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        getIssuer: async function (_) {
            return appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
        },
        buildAccessTokenPayload: async function (input) {
            return getDefaultAccessTokenPayload(input.user, input.scopes, input.sessionHandle, input.userContext);
        },
        buildIdTokenPayload: async function (input) {
            return getDefaultIdTokenPayload(input.user, input.scopes, input.sessionHandle, input.userContext);
        },
        buildUserInfo: async function ({ user, accessTokenPayload, scopes, tenantId, userContext }) {
            return getDefaultUserInfoPayload(user, accessTokenPayload, scopes, tenantId, userContext);
        },
        validateOAuth2AccessToken: async function (input) {
            var _a, _b, _c, _d, _e;
            const payload = (await jose.jwtVerify(input.token, combinedRemoteJWKSet_1.getCombinedJWKS())).payload;
            // if (payload.stt !== 1) {
            //     throw new Error("Wrong token type");
            // }
            // TODO: we should be able uncomment this after we get proper core support
            // TODO: make this configurable?
            // const expectedIssuer =
            //     appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            // if (payload.iss !== expectedIssuer) {
            //     throw new Error("Issuer mismatch: this token was likely issued by another application or spoofed");
            // }
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
                    new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/introspect`),
                    {
                        $isFormData: true,
                        token: input.token,
                    },
                    input.userContext
                );
                // TODO: fix after the core interface is there
                if (response.status !== "OK" || response.data.active !== true) {
                    throw new Error(response.data.error);
                }
            }
            return { status: "OK", payload: payload };
        },
        revokeToken: async function (input) {
            const requestBody = {
                $isFormData: true,
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
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/pub/revoke`),
                requestBody,
                input.userContext
            );
            if (res.status !== "OK") {
                return {
                    status: "OAUTH_ERROR",
                    statusCode: res.statusCode,
                    error: res.data.error,
                    errorDescription: res.data.error_description,
                };
            }
            return { status: "OK" };
        },
        introspectToken: async function ({ token, scopes, userContext }) {
            // Determine if the token is an access token by checking if it doesn't start with "ory_rt"
            const isAccessToken = !token.startsWith("ory_rt");
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
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/introspect`),
                {
                    $isFormData: true,
                    token,
                    scope: scopes ? scopes.join(" ") : undefined,
                },
                userContext
            );
            return res.data;
        },
    };
}
exports.default = getRecipeInterface;