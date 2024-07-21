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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const utils_1 = require("../../utils");
const OAuth2Client_1 = require("./OAuth2Client");
const __1 = require("../..");
function getRecipeInterface(querier, _config, _appInfo, getDefaultIdTokenPayload, getDefaultUserInfoPayload) {
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
                redirectTo: resp.data.redirect_to.replace(
                    querier_1.hydraPubDomain,
                    _appInfo.apiDomain.getAsStringDangerous() + _appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        rejectLoginRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/login/reject`),
                {
                    error: input.error.error,
                    error_debug: input.error.errorDebug,
                    error_description: input.error.errorDescription,
                    error_hint: input.error.errorHint,
                    status_code: input.error.statusCode,
                },
                {
                    login_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: resp.data.redirect_to.replace(
                    querier_1.hydraPubDomain,
                    _appInfo.apiDomain.getAsStringDangerous() + _appInfo.apiBasePath.getAsStringDangerous()
                ),
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
                requestUrl: resp.data.request_url,
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
                redirectTo: resp.data.redirect_to.replace(
                    querier_1.hydraPubDomain,
                    _appInfo.apiDomain.getAsStringDangerous() + _appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        rejectConsentRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/consent/reject`),
                {
                    error: input.error.error,
                    error_debug: input.error.errorDebug,
                    error_description: input.error.errorDescription,
                    error_hint: input.error.errorHint,
                    status_code: input.error.statusCode,
                },
                {
                    consent_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: resp.data.redirect_to.replace(
                    querier_1.hydraPubDomain,
                    _appInfo.apiDomain.getAsStringDangerous() + _appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        getLogoutRequest: async function (input) {
            const resp = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/oauth2/admin/oauth2/auth/requests/logout"),
                { logout_challenge: input.challenge },
                input.userContext
            );
            return {
                challenge: resp.data.challenge,
                client: OAuth2Client_1.OAuth2Client.fromAPIResponse(resp.data.client),
                requestUrl: resp.data.request_url,
                rpInitiated: resp.data.rp_initiated,
                sid: resp.data.sid,
                subject: resp.data.subject,
            };
        },
        acceptLogoutRequest: async function (input) {
            const resp = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/consent/logout/accept`),
                {},
                {
                    logout_challenge: input.challenge,
                },
                input.userContext
            );
            return {
                // TODO: FIXME!!!
                redirectTo: resp.data.redirect_to.replace(
                    querier_1.hydraPubDomain,
                    _appInfo.apiDomain.getAsStringDangerous() + _appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        rejectLogoutRequest: async function (input) {
            await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/oauth2/auth/requests/consent/logout/reject`),
                {},
                {
                    logout_challenge: input.challenge,
                },
                input.userContext
            );
        },
        authorization: async function (input) {
            var _a, _b, _c, _d;
            const resp = await querier.sendGetRequestWithResponseHeaders(
                new normalisedURLPath_1.default(`/recipe/oauth2/pub/auth`),
                input.params,
                {
                    Cookie: `${input.cookies}`,
                },
                input.userContext
            );
            const redirectTo = resp.headers.get("Location");
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
                if (
                    consentRequest.skip ||
                    ((_a = consentRequest.client) === null || _a === void 0 ? void 0 : _a.skipConsent)
                ) {
                    const idToken = this.buildIdTokenPayload({
                        user,
                        session: input.session,
                        defaultPayload: await getDefaultIdTokenPayload(
                            user,
                            (_b = consentRequest.requestedScope) !== null && _b !== void 0 ? _b : [],
                            input.userContext
                        ),
                        scopes: consentRequest.requestedScope || [],
                        userContext: input.userContext,
                    });
                    const accessTokenPayload = this.buildAccessTokenPayload({
                        user,
                        session: input.session,
                        defaultPayload: input.session.getAccessTokenPayload(input.userContext),
                        userContext: input.userContext,
                        scopes: consentRequest.requestedScope || [],
                    });
                    const consentRes = await this.acceptConsentRequest(
                        Object.assign(Object.assign({}, input), {
                            challenge: consentRequest.challenge,
                            grantAccessTokenAudience: consentRequest.requestedAccessTokenAudience,
                            grantScope: consentRequest.requestedScope,
                            session: {
                                id_token: idToken,
                                access_token: accessTokenPayload,
                            },
                        })
                    );
                    return {
                        redirectTo: consentRes.redirectTo,
                        setCookie: (_c = resp.headers.get("set-cookie")) !== null && _c !== void 0 ? _c : undefined,
                    };
                }
            }
            return {
                redirectTo,
                setCookie: (_d = resp.headers.get("set-cookie")) !== null && _d !== void 0 ? _d : undefined,
            };
        },
        token: async function (input) {
            const body = new FormData(); // TODO: we ideally want to avoid using formdata, the core can do the translation
            for (const key in input.body) {
                body.append(key, input.body[key]);
            }
            const res = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/pub/token`),
                body,
                input.userContext
            );
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
        createOAuth2Client: async function (input, userContext) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                utils_1.transformObjectKeys(input, "snake-case"),
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
            return input.defaultPayload;
        },
        buildIdTokenPayload: async function (input) {
            return input.defaultPayload;
        },
        buildUserInfo: async function ({ user, accessTokenPayload, scopes, userContext }) {
            return getDefaultUserInfoPayload(user, accessTokenPayload, scopes, userContext);
        },
    };
}
exports.default = getRecipeInterface;
