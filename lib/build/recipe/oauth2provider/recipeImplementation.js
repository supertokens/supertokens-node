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
// TODO: Remove this core changes are done
function getUpdatedRedirectTo(appInfo, redirectTo) {
    return redirectTo
        .replace(
            querier_1.hydraPubDomain,
            appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
        )
        .replace("oauth2/", "oauth/");
}
function getRecipeInterface(querier, _config, appInfo, getDefaultIdTokenPayload, getDefaultUserInfoPayload) {
    return {
        getLoginRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth2/admin/oauth2/auth/requests/login"),
                { login_challenge: input.challenge },
                input.userContext
            );
            return {
                challenge: resp.data.challenge,
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(resp.data.client),
                oidcContext: resp.data.oidc_context,
                requestUrl: resp.data.request_url,
                requestedAccessTokenAudience: resp.data.requested_access_token_audience,
                requestedScope: resp.data.requested_scope,
                sessionId: resp.data.session_id,
                skip: resp.data.skip,
                subject: resp.data.subject,
            };
        },
        acceptLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/login/accept`),
                {
                    acr: input.acr,
                    amr: input.amr,
                    context: input.context,
                    extend_session_lifespan: input.extendSessionLifespan,
                    force_subject_identifier: input.forceSubjectIdentifier,
                    identity_provider_session_id: input.identityProviderSessionId,
                    remember: input.remember,
                    remember_for: input.rememberFor,
                    subject: input.subject,
                },
                {
                    login_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.data.redirect_to),
            };
        },
        rejectLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/login/reject`),
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
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.data.redirect_to),
            };
        },
        getConsentRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth2/admin/oauth2/auth/requests/consent"),
                { consent_challenge: input.challenge },
                input.userContext
            );
            return {
                acr: resp.data.acr,
                amr: resp.data.amr,
                challenge: resp.data.challenge,
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(resp.data.client),
                context: resp.data.context,
                loginChallenge: resp.data.login_challenge,
                loginSessionId: resp.data.login_session_id,
                oidcContext: resp.data.oidc_context,
                requestedAccessTokenAudience: resp.data.requested_access_token_audience,
                requestedScope: resp.data.requested_scope,
                skip: resp.data.skip,
                subject: resp.data.subject,
            };
        },
        acceptConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/consent/accept`),
                {
                    context: input.context,
                    grant_access_token_audience: input.grantAccessTokenAudience,
                    grant_scope: input.grantScope,
                    handled_at: input.handledAt,
                    remember: input.remember,
                    remember_for: input.rememberFor,
                    session: input.session,
                },
                {
                    consent_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.data.redirect_to),
            };
        },
        rejectConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/consent/reject`),
                {
                    error: input.error.error,
                    error_description: input.error.errorDescription,
                    status_code: input.error.statusCode,
                },
                {
                    consent_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: getUpdatedRedirectTo(appInfo, resp.data.redirect_to),
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
            const resp = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/pub/auth`),
                input.params,
                {
                    // TODO: if session is not set also clear the oauth2 cookie
                    Cookie: `${input.cookies}`,
                },
                input.userContext
            );
            const redirectTo = getUpdatedRedirectTo(appInfo, resp.headers.get("Location"));
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
                const idToken = this.buildIdTokenPayload({
                    user,
                    client: consentRequest.client,
                    session: input.session,
                    scopes: consentRequest.requestedScope || [],
                    userContext: input.userContext,
                });
                const accessTokenPayload = await this.buildAccessTokenPayload({
                    user,
                    client: consentRequest.client,
                    session: input.session,
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
                    setCookie: (_a = resp.headers.get("set-cookie")) !== null && _a !== void 0 ? _a : undefined,
                };
            }
            return {
                redirectTo,
                setCookie: (_b = resp.headers.get("set-cookie")) !== null && _b !== void 0 ? _b : undefined,
            };
        },
        tokenExchange: async function (input) {
            const body = { $isFormData: true }; // TODO: we ideally want to avoid using formdata, the core can do the translation
            for (const key in input.body) {
                body[key] = input.body[key];
            }
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/pub/token`),
                body,
                input.userContext
            );
            if (res.status !== "OK") {
                return {
                    statusCode: res.statusCode,
                    error: res.data.error,
                    errorDescription: res.data.error_description,
                };
            }
            return res.data;
        },
        getOAuth2Clients: async function (input, userContext) {
            var _a;
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                Object.assign(Object.assign({}, utils_1.transformObjectKeys(input, "snake-case")), {
                    page_token: input.paginationToken,
                }),
                {},
                userContext
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
        getOAuth2Client: async function (input, userContext) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                {},
                {},
                userContext
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
        createOAuth2Client: async function (input, userContext) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                Object.assign(Object.assign({}, utils_1.transformObjectKeys(input, "snake-case")), {
                    // TODO: these defaults should be set/enforced on the core side
                    access_token_strategy: "jwt",
                    skip_consent: true,
                    subject_type: "public",
                }),
                userContext
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
        updateOAuth2Client: async function (input, userContext) {
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
                userContext
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
        deleteOAuth2Client: async function (input, userContext) {
            let response = await querier.sendDeleteRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                undefined,
                undefined,
                userContext
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
        buildAccessTokenPayload: async function (input) {
            const stAccessTokenPayload = input.session.getAccessTokenPayload(input.userContext);
            const sessionInfo = await session_1.getSessionInformation(stAccessTokenPayload.sessionHandle);
            if (sessionInfo === undefined) {
                throw new Error("Session not found");
            }
            return {
                tId: stAccessTokenPayload.tId,
                rsub: stAccessTokenPayload.rsub,
                sessionHandle: stAccessTokenPayload.sessionHandle,
                // auth_time: sessionInfo?.timeCreated,
                iss: appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous(),
            };
        },
        buildIdTokenPayload: async function (input) {
            return getDefaultIdTokenPayload(input.user, input.scopes, input.userContext);
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
            if ("authorizationHeader" in input) {
                requestBody.authorizationHeader = input.authorizationHeader;
            } else {
                if ("clientId" in input) {
                    requestBody.client_id = input.clientId;
                }
                if ("clientSecret" in input) {
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
                    statusCode: res.statusCode,
                    error: res.data.error,
                    errorDescription: res.data.error_description,
                };
            }
            return { status: "OK" };
        },
    };
}
exports.default = getRecipeInterface;
