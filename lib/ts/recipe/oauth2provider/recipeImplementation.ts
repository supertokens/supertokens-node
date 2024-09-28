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
import { Querier } from "../../querier";
import { JSONObject, NormalisedAppinfo } from "../../types";
import {
    RecipeInterface,
    TypeNormalisedInput,
    ConsentRequest,
    LoginRequest,
    PayloadBuilderFunction,
    UserInfoBuilderFunction,
} from "./types";
import { OAuth2Client } from "./OAuth2Client";
import { getUser } from "../..";
import { getCombinedJWKS } from "../../combinedRemoteJWKSet";
import SessionRecipe from "../session/recipe";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";

function getUpdatedRedirectTo(appInfo: NormalisedAppinfo, redirectTo: string) {
    return redirectTo.replace(
        "{apiDomain}",
        appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous()
    );
}

function copyAndCleanRequestBodyInput(input: any): any {
    let result = {
        ...input,
    };
    delete result.userContext;
    delete result.tenantId;
    delete result.session;

    return result;
}

export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getDefaultAccessTokenPayload: PayloadBuilderFunction,
    getDefaultIdTokenPayload: PayloadBuilderFunction,
    getDefaultUserInfoPayload: UserInfoBuilderFunction
): RecipeInterface {
    return {
        getLoginRequest: async function (this: RecipeInterface, input): Promise<LoginRequest> {
            const resp = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/oauth/auth/requests/login"),
                { loginChallenge: input.challenge },
                input.userContext
            );

            return {
                challenge: resp.challenge,
                client: OAuth2Client.fromAPIResponse(resp.client),
                oidcContext: resp.oidcContext,
                requestUrl: resp.requestUrl,
                requestedAccessTokenAudience: resp.requestedAccessTokenAudience,
                requestedScope: resp.requestedScope,
                sessionId: resp.sessionId,
                skip: resp.skip,
                subject: resp.subject,
            };
        },
        acceptLoginRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/login/accept`),
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

            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        rejectLoginRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/login/reject`),
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

            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        getConsentRequest: async function (this: RecipeInterface, input): Promise<ConsentRequest> {
            const resp = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/oauth/auth/requests/consent"),
                { consentChallenge: input.challenge },
                input.userContext
            );

            return {
                acr: resp.acr,
                amr: resp.amr,
                challenge: resp.challenge,
                client: OAuth2Client.fromAPIResponse(resp.client),
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
        acceptConsentRequest: async function (this: RecipeInterface, input): Promise<{ redirectTo: string }> {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/consent/accept`),
                {
                    context: input.context,
                    grantAccessTokenAudience: input.grantAccessTokenAudience,
                    grantScope: input.grantScope,
                    handledAt: input.handledAt,
                    remember: input.remember,
                    rememberFor: input.rememberFor,
                    iss: await this.getIssuer({ userContext: input.userContext }),
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

            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },

        rejectConsentRequest: async function (this: RecipeInterface, input) {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/consent/reject`),
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

            return {
                redirectTo: getUpdatedRedirectTo(appInfo, resp.redirectTo),
            };
        },
        authorization: async function (this: RecipeInterface, input) {
            // we handle this in the backend SDK level
            if (input.params.prompt === "none") {
                input.params["st_prompt"] = "none";
                delete input.params.prompt;
            }

            let payloads: { idToken: JSONObject | undefined; accessToken: JSONObject | undefined } | undefined;

            if (input.params.client_id === undefined || typeof input.params.client_id !== "string") {
                return {
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "client_id is required and must be a string",
                };
            }

            const scopes = await this.getRequestedScopes({
                scopeParam: input.params.scope?.split(" ") || [],
                clientId: input.params.client_id as string,
                recipeUserId: input.session?.getRecipeUserId(),
                sessionHandle: input.session?.getHandle(),
                userContext: input.userContext,
            });

            const responseTypes = input.params.response_type?.split(" ") ?? [];

            if (input.session !== undefined) {
                const clientInfo = await this.getOAuth2Client({
                    clientId: input.params.client_id as string,
                    userContext: input.userContext,
                });

                if (clientInfo.status === "ERROR") {
                    throw new Error(clientInfo.error);
                }
                const client = clientInfo.client;

                const user = await getUser(input.session.getUserId());
                if (!user) {
                    throw new Error("User not found");
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
                new NormalisedURLPath(`/recipe/oauth/auth`),
                {
                    params: {
                        ...input.params,
                        scope: scopes.join(" "),
                    },
                    cookies: input.cookies,
                    session: payloads,
                },
                input.userContext
            );

            if (resp.status === "CLIENT_NOT_FOUND_ERROR") {
                return {
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "The provided client_id is not valid",
                };
            }

            if (resp.status !== "OK") {
                return {
                    statusCode: resp.statusCode,
                    error: resp.error,
                    errorDescription: resp.errorDescription,
                };
            }

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
                    initialAccessTokenPayload: payloads?.accessToken,
                    initialIdTokenPayload: payloads?.idToken,
                });

                return {
                    redirectTo: consentRes.redirectTo,
                    setCookie: resp.cookies,
                };
            }
            return { redirectTo, setCookie: resp.cookies };
        },

        tokenExchange: async function (this: RecipeInterface, input) {
            const body: any = {
                inputBody: input.body,
                authorizationHeader: input.authorizationHeader,
            };

            body.iss = await this.getIssuer({ userContext: input.userContext });

            if (input.body.grant_type === "password") {
                return {
                    statusCode: 400,
                    error: "invalid_request",
                    errorDescription: "Unsupported grant type: password",
                };
            }

            if (input.body.grant_type === "client_credentials") {
                if (input.body.client_id === undefined) {
                    return {
                        statusCode: 400,
                        error: "invalid_request",
                        errorDescription: "client_id is required",
                    };
                }

                const scopes = input.body.scope?.split(" ") ?? [];
                const clientInfo = await this.getOAuth2Client({
                    clientId: input.body.client_id as string,
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
                const scopes = input.body.scope?.split(" ") ?? [];
                const tokenInfo = await this.introspectToken({
                    token: input.body.refresh_token!,
                    scopes,
                    userContext: input.userContext,
                });

                if (tokenInfo.active === true) {
                    const sessionHandle = tokenInfo.sessionHandle as string;

                    const clientInfo = await this.getOAuth2Client({
                        clientId: tokenInfo.client_id as string,
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
                    const user = await getUser(tokenInfo.sub as string);
                    if (!user) {
                        throw new Error("User not found");
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

            const res = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth/token`),
                body,
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
            let response = await querier.sendGetRequestWithResponseHeaders(
                new NormalisedURLPath(`/recipe/oauth/clients/list`),
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
                    clients: response.body.clients.map((client: any) => OAuth2Client.fromAPIResponse(client)),
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
                new NormalisedURLPath(`/recipe/oauth/clients`),
                { clientId: input.clientId },
                {},
                input.userContext
            );

            return {
                status: "OK",
                client: OAuth2Client.fromAPIResponse(response.body),
            };
            // return {
            //     status: "ERROR",
            //     error: response.body.error,
            //     errorHint: response.body.errorHint,
            // };
        },
        createOAuth2Client: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth/clients`),
                copyAndCleanRequestBodyInput(input),
                input.userContext
            );

            return {
                status: "OK",
                client: OAuth2Client.fromAPIResponse(response),
            };
            // return {
            //     status: "ERROR",
            //     error: response.error,
            //     errorHint: response.errorHint,
            // };
        },
        updateOAuth2Client: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/clients`),
                copyAndCleanRequestBodyInput(input),
                { clientId: input.clientId },
                input.userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client.fromAPIResponse(response),
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
                new NormalisedURLPath(`/recipe/oauth/clients/remove`),
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
        getRequestedScopes: async function (this: RecipeInterface, input): Promise<string[]> {
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
                if (input.tenantId !== undefined && input.tenantId !== DEFAULT_TENANT_ID) {
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
            const payload = (
                await jose.jwtVerify(input.token, getCombinedJWKS(SessionRecipe.getInstanceOrThrowError().config))
            ).payload;

            if (payload.stt !== 1) {
                throw new Error("Wrong token type");
            }

            if (input.requirements?.clientId !== undefined && payload.client_id !== input.requirements.clientId) {
                throw new Error(
                    `The token doesn't belong to the specified client (${input.requirements.clientId} !== ${payload.client_id})`
                );
            }

            if (
                input.requirements?.scopes !== undefined &&
                input.requirements.scopes.some((scope) => !(payload.scp as string[]).includes(scope))
            ) {
                throw new Error("The token is missing some required scopes");
            }

            const aud = payload.aud instanceof Array ? payload.aud : payload.aud?.split(" ") ?? [];
            if (input.requirements?.audience !== undefined && !aud.includes(input.requirements.audience)) {
                throw new Error("The token doesn't belong to the specified audience");
            }

            if (input.checkDatabase) {
                let response = await querier.sendPostRequest(
                    new NormalisedURLPath(`/recipe/oauth/introspect`),
                    {
                        token: input.token,
                    },
                    input.userContext
                );

                if (response.active !== true) {
                    throw new Error("The token is expired, invalid or has been revoked");
                }
            }
            return { status: "OK", payload: payload as JSONObject };
        },
        revokeToken: async function (this: RecipeInterface, input) {
            const requestBody: Record<string, unknown> = {
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
                new NormalisedURLPath(`/recipe/oauth/token/revoke`),
                requestBody,
                input.userContext
            );

            if (res.status !== "OK") {
                return {
                    statusCode: res.statusCode,
                    error: res.error,
                    errorDescription: res.errorDescription,
                };
            }

            return { status: "OK" };
        },
        revokeTokensBySessionHandle: async function (this: RecipeInterface, input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth/session/revoke`),
                { sessionHandle: input.sessionHandle },
                input.userContext
            );

            return { status: "OK" };
        },
        revokeTokensByClientId: async function (this: RecipeInterface, input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth/tokens/revoke`),
                { clientId: input.clientId },
                input.userContext
            );

            return { status: "OK" };
        },

        introspectToken: async function (this: RecipeInterface, { token, scopes, userContext }) {
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
                new NormalisedURLPath(`/recipe/oauth/introspect`),
                {
                    token,
                    scope: scopes ? scopes.join(" ") : undefined,
                },
                userContext
            );

            return res;
        },

        endSession: async function (this: RecipeInterface, input) {
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
                new NormalisedURLPath(`/recipe/oauth/sessions/logout`),
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
                    redirectTo = (
                        await this.acceptLogoutRequest({
                            challenge: logoutChallenge,
                            userContext: input.userContext,
                        })
                    ).redirectTo;
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
        acceptLogoutRequest: async function (this: RecipeInterface, input) {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/logout/accept`),
                { challenge: input.challenge },
                {},
                input.userContext
            );

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
        rejectLogoutRequest: async function (this: RecipeInterface, input) {
            const resp = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/oauth/auth/requests/logout/reject`),
                {},
                { challenge: input.challenge },
                input.userContext
            );

            if (resp.status != "OK") {
                throw new Error(resp.error);
            }

            return { status: "OK" };
        },
        getIssuer: async function () {
            return appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
        },
    };
}
