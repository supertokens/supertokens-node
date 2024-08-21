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

import { APIInterface } from "../types";
import { handleLoginInternalRedirects, handleLogoutInternalRedirects, loginGET } from "./utils";

export default function getAPIImplementation(): APIInterface {
    return {
        loginGET: async ({ loginChallenge, options, session, shouldTryRefresh, userContext }) => {
            const response = await loginGET({
                recipeImplementation: options.recipeImplementation,
                loginChallenge,
                session,
                shouldTryRefresh,
                isDirectCall: true,
                userContext,
            });
            return handleLoginInternalRedirects({
                response,
                cookie: options.req.getHeaderValue("cookie"),
                recipeImplementation: options.recipeImplementation,
                session,
                shouldTryRefresh,
                userContext,
            });
        },

        authGET: async ({ options, params, cookie, session, shouldTryRefresh, userContext }) => {
            const response = await options.recipeImplementation.authorization({
                params,
                cookies: cookie,
                session,
                userContext,
            });

            return handleLoginInternalRedirects({
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
            const { client } = await options.recipeImplementation.getLoginRequest({
                challenge: loginChallenge,
                userContext,
            });

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

            return handleLogoutInternalRedirects({
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

            return handleLogoutInternalRedirects({
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

            const { redirectTo } = await handleLogoutInternalRedirects({
                response,
                recipeImplementation: options.recipeImplementation,
                userContext,
            });

            return { frontendRedirectTo: redirectTo };
        },
    };
}
