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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIImplementation;
const utils_1 = require("./utils");
function getAPIImplementation() {
    return {
        loginGET: async ({ loginChallenge, options, session, shouldTryRefresh, userContext }) => {
            const response = await (0, utils_1.loginGET)({
                recipeImplementation: options.recipeImplementation,
                loginChallenge,
                session,
                shouldTryRefresh,
                isDirectCall: true,
                userContext,
            });
            if ("error" in response) {
                return response;
            }
            const respAfterInternalRedirects = await (0, utils_1.handleLoginInternalRedirects)({
                response,
                cookie: options.req.getHeaderValue("cookie"),
                recipeImplementation: options.recipeImplementation,
                session,
                shouldTryRefresh,
                userContext,
            });
            if ("error" in respAfterInternalRedirects) {
                return respAfterInternalRedirects;
            }
            return {
                frontendRedirectTo: respAfterInternalRedirects.redirectTo,
                cookies: respAfterInternalRedirects.cookies,
            };
        },
        authGET: async ({ options, params, cookie, session, shouldTryRefresh, userContext }) => {
            const response = await options.recipeImplementation.authorization({
                params,
                cookies: cookie,
                session,
                userContext,
            });
            if ("error" in response) {
                return response;
            }
            return (0, utils_1.handleLoginInternalRedirects)({
                response,
                recipeImplementation: options.recipeImplementation,
                cookie,
                session,
                shouldTryRefresh,
                userContext,
            });
        },
        tokenPOST: async (input) => {
            return input.options.recipeImplementation.tokenExchange({
                authorizationHeader: input.authorizationHeader,
                body: input.body,
                userContext: input.userContext,
            });
        },
        loginInfoGET: async ({ loginChallenge, options, userContext }) => {
            const loginRes = await options.recipeImplementation.getLoginRequest({
                challenge: loginChallenge,
                userContext,
            });
            if (loginRes.status === "ERROR") {
                return loginRes;
            }
            const { client } = loginRes;
            return {
                status: "OK",
                info: {
                    clientId: client.clientId,
                    clientName: client.clientName,
                    tosUri: client.tosUri,
                    policyUri: client.policyUri,
                    logoUri: client.logoUri,
                    clientUri: client.clientUri,
                    metadata: client.metadata,
                },
            };
        },
        userInfoGET: async ({ accessTokenPayload, user, scopes, tenantId, options, userContext }) => {
            return options.recipeImplementation.buildUserInfo({
                user,
                accessTokenPayload,
                scopes,
                tenantId,
                userContext,
            });
        },
        revokeTokenPOST: async (input) => {
            if ("authorizationHeader" in input && input.authorizationHeader !== undefined) {
                return input.options.recipeImplementation.revokeToken({
                    token: input.token,
                    authorizationHeader: input.authorizationHeader,
                    userContext: input.userContext,
                });
            } else if ("clientId" in input && input.clientId !== undefined) {
                return input.options.recipeImplementation.revokeToken({
                    token: input.token,
                    clientId: input.clientId,
                    clientSecret: input.clientSecret,
                    userContext: input.userContext,
                });
            } else {
                throw new Error(`Either of 'authorizationHeader' or 'clientId' must be provided`);
            }
        },
        introspectTokenPOST: async (input) => {
            return input.options.recipeImplementation.introspectToken({
                token: input.token,
                scopes: input.scopes,
                userContext: input.userContext,
            });
        },
        endSessionGET: async ({ options, params, session, shouldTryRefresh, userContext }) => {
            const response = await options.recipeImplementation.endSession({
                params,
                session,
                shouldTryRefresh,
                userContext,
            });
            if ("error" in response) {
                return response;
            }
            return (0, utils_1.handleLogoutInternalRedirects)({
                response,
                session,
                recipeImplementation: options.recipeImplementation,
                userContext,
            });
        },
        endSessionPOST: async ({ options, params, session, shouldTryRefresh, userContext }) => {
            const response = await options.recipeImplementation.endSession({
                params,
                session,
                shouldTryRefresh,
                userContext,
            });
            if ("error" in response) {
                return response;
            }
            return (0, utils_1.handleLogoutInternalRedirects)({
                response,
                session,
                recipeImplementation: options.recipeImplementation,
                userContext,
            });
        },
        logoutPOST: async ({ logoutChallenge, options, session, userContext }) => {
            if (session != undefined) {
                await session.revokeSession(userContext);
            }
            const response = await options.recipeImplementation.acceptLogoutRequest({
                challenge: logoutChallenge,
                userContext,
            });
            if ("error" in response) {
                return response;
            }
            const res = await (0, utils_1.handleLogoutInternalRedirects)({
                response,
                recipeImplementation: options.recipeImplementation,
                userContext,
            });
            if ("error" in res) {
                return res;
            }
            return { status: "OK", frontendRedirectTo: res.redirectTo };
        },
    };
}
