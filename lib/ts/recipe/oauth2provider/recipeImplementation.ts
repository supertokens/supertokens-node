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

import * as jose from "jose";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier, hydraPubDomain } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import {
    RecipeInterface,
    TypeNormalisedInput,
    ConsentRequest,
    LoginRequest,
    PayloadBuilderFunction,
    UserInfoBuilderFunction,
} from "./types";
import { toSnakeCase, transformObjectKeys } from "../../utils";
import { OAuth2Client } from "./OAuth2Client";
import { getUser } from "../..";
import { getCombinedJWKS } from "../../combinedRemoteJWKSet";
import { JSONObject } from "@loopback/core";

export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getDefaultIdTokenPayload: PayloadBuilderFunction,
    getDefaultUserInfoPayload: UserInfoBuilderFunction
): RecipeInterface {
    return {
        getLoginRequest: async function (this: RecipeInterface, input): Promise<LoginRequest> {
            const resp = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/oauth2/admin/oauth2/auth/requests/login"),
                { login_challenge: input.challenge },
                input.userContext
            );

            return {
                challenge: resp.data.challenge,
                client: OAuth2Client.fromAPIResponse(resp.data.client),
                oidcContext: resp.data.oidc_context,
                requestUrl: resp.data.request_url,
                requestedAccessTokenAudience: resp.data.requested_access_token_audience,
                requestedScope: resp.data.requested_scope,
                sessionId: resp.data.session_id,
                skip: resp.data.skip,
                subject: resp.data.subject,
            };
        },
        acceptLoginRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/oauth2/auth/requests/login/accept`),
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
                    hydraPubDomain,
                    appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        rejectLoginRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/oauth2/auth/requests/login/reject`),
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
                    hydraPubDomain,
                    appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        getConsentRequest: async function (this: RecipeInterface, input): Promise<ConsentRequest> {
            const resp = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/oauth2/admin/oauth2/auth/requests/consent"),
                { consent_challenge: input.challenge },
                input.userContext
            );

            return {
                acr: resp.data.acr,
                amr: resp.data.amr,
                challenge: resp.data.challenge,
                client: OAuth2Client.fromAPIResponse(resp.data.client),
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
        acceptConsentRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/oauth2/auth/requests/consent/accept`),
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
                    hydraPubDomain,
                    appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },

        rejectConsentRequest: async function (this: RecipeInterface, input) {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/oauth2/auth/requests/consent/reject`),
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
                    hydraPubDomain,
                    appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
                ),
            };
        },
        authorization: async function (this: RecipeInterface, input) {
            const resp = await querier.sendGetRequestWithResponseHeaders(
                new NormalisedURLPath(`/recipe/oauth2/pub/auth`),
                input.params,
                {
                    Cookie: `${input.cookies}`,
                },
                input.userContext
            );

            const redirectTo = resp.headers.get("Location")!;
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

                const user = await getUser(input.session.getUserId());
                if (!user) {
                    throw new Error("Should not happen");
                }
                const idToken = this.buildIdTokenPayload({
                    user,
                    session: input.session,
                    defaultPayload: await getDefaultIdTokenPayload(
                        user,
                        consentRequest.requestedScope ?? [],
                        input.userContext
                    ),
                    scopes: consentRequest.requestedScope || [],
                    userContext: input.userContext,
                });

                const accessTokenPayload = await this.buildAccessTokenPayload({
                    user,
                    session: input.session,
                    defaultPayload: {
                        ...input.session.getAccessTokenPayload(input.userContext), // TODO: validate based on access token structure rfc
                        iss: appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous(),
                        scope: consentRequest.requestedScope?.join(" ") ?? "",
                        aud: [consentRequest.client!.clientId],
                    },
                    userContext: input.userContext,
                    scopes: consentRequest.requestedScope || [],
                });

                const consentRes = await this.acceptConsentRequest({
                    ...input,
                    challenge: consentRequest.challenge,
                    grantAccessTokenAudience: consentRequest.requestedAccessTokenAudience,
                    grantScope: consentRequest.requestedScope,
                    session: {
                        id_token: idToken,
                        access_token: accessTokenPayload,
                    },
                });

                return {
                    redirectTo: consentRes.redirectTo,
                    setCookie: resp.headers.get("set-cookie") ?? undefined,
                };
            }
            return { redirectTo, setCookie: resp.headers.get("set-cookie") ?? undefined };
        },

        token: async function (this: RecipeInterface, input) {
            const body: any = { $isFormData: true }; // TODO: we ideally want to avoid using formdata, the core can do the translation
            for (const key in input.body) {
                body[key] = input.body[key];
            }
            const res = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth2/pub/token`),
                body,
                input.userContext
            );

            return res.data;
        },

        getOAuth2Clients: async function (input, userContext) {
            let response = await querier.sendGetRequestWithResponseHeaders(
                new NormalisedURLPath(`/recipe/oauth2/admin/clients`),
                {
                    ...transformObjectKeys(input, "snake-case"),
                    page_token: input.paginationToken,
                },
                {},
                userContext
            );

            if (response.body.status === "OK") {
                // Pagination info is in the Link header, containing comma-separated links:
                // "first", "next" (if applicable).
                // Example: Link: </admin/clients?page_size=5&page_token=token1>; rel="first", </admin/clients?page_size=5&page_token=token2>; rel="next"

                // We parse the nextPaginationToken from the Link header using RegExp
                let nextPaginationToken: string | undefined;
                const linkHeader = response.headers.get("link") ?? "";

                const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextLinkMatch) {
                    const url = nextLinkMatch[1];
                    const urlParams = new URLSearchParams(url.split("?")[1]);
                    nextPaginationToken = urlParams.get("page_token") as string;
                }

                return {
                    status: "OK",
                    clients: response.body.data.map((client: any) => OAuth2Client.fromAPIResponse(client)),
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
                new NormalisedURLPath(`/recipe/oauth2/admin/clients`),
                {
                    ...transformObjectKeys(input, "snake-case"),
                    // TODO: these defaults should be set/enforced on the core side
                    access_token_strategy: "jwt",
                    skip_consent: true,
                    subject_type: "public",
                },
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client.fromAPIResponse(response.data),
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
            const requestBody = Object.entries(input).reduce<
                Array<{ from: string; op: "replace"; path: string; value: any }>
            >((result, [key, value]) => {
                result.push({
                    from: `/${toSnakeCase(key)}`,
                    op: "replace",
                    path: `/${toSnakeCase(key)}`,
                    value,
                });
                return result;
            }, []);

            let response = await querier.sendPatchRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/clients/${input.clientId}`),
                requestBody,
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client.fromAPIResponse(response.data),
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
                new NormalisedURLPath(`/recipe/oauth2/admin/clients/${input.clientId}`),
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
        buildUserInfo: async function ({ user, accessTokenPayload, scopes, tenantId, userContext }) {
            return getDefaultUserInfoPayload(user, accessTokenPayload, scopes, tenantId, userContext);
        },
        validateOAuth2AccessToken: async function (input) {
            const payload = (await jose.jwtVerify(input.token, getCombinedJWKS())).payload;

            // TODO: make this configurable?
            // const expectedIssuer =
            //     appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            // if (payload.iss !== expectedIssuer) {
            //     throw new Error("Issuer mismatch: this token was likely issued by another application or spoofed");
            // }

            // TODO: Fix this
            const aud =
                (payload.ext as any)?.aud ??
                (payload.aud instanceof Array ? payload.aud : payload.aud?.split(" ") ?? []);
            if (input.expectedAudience !== undefined && !aud.includes(input.expectedAudience)) {
                throw new Error("Audience mismatch: this token doesn't belong to the specified client");
            }

            // TODO: add a check to make sure this is the right token type as they can be signed with the same key

            return { status: "OK", payload: payload as JSONObject };
        },
        validateOAuth2IdToken: async function (input) {
            const payload = (await jose.jwtVerify(input.token, getCombinedJWKS())).payload;

            // TODO: make this configurable?
            // const expectedIssuer =
            //     appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            // if (input.expectedAudience !== undefined && payload.iss !== expectedIssuer) {
            //     throw new Error("Issuer mismatch: this token was likely issued by another application or spoofed");
            // }
            const aud = payload.aud instanceof Array ? payload.aud : payload.aud?.split(" ") ?? [];
            if (input.expectedAudience !== undefined && !aud.includes(input.expectedAudience)) {
                throw new Error("Audience mismatch: this token doesn't belong to the specified client");
            }

            // TODO: add a check to make sure this is the right token type as they can be signed with the same key

            return { status: "OK", payload: payload as JSONObject };
        },
    };
}
