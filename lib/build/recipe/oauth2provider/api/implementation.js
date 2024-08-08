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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function getAPIImplementation() {
    return {
        loginGET: async ({ loginChallenge, options, session, userContext }) => {
            const response = await utils_1.loginGET({
                recipeImplementation: options.recipeImplementation,
                loginChallenge,
                session,
                isDirectCall: true,
                userContext,
            });
            return utils_1.handleInternalRedirects({
                response,
                cookie: options.req.getHeaderValue("cookie"),
                recipeImplementation: options.recipeImplementation,
                session,
                userContext,
            });
        },
        authGET: async ({ options, params, cookie, session, userContext }) => {
            const response = await options.recipeImplementation.authorization({
                params,
                cookies: cookie,
                session,
                userContext,
            });
            return utils_1.handleInternalRedirects({
                response,
                recipeImplementation: options.recipeImplementation,
                cookie,
                session,
                userContext,
            });
        },
        tokenPOST: async (input) => {
            return input.options.recipeImplementation.tokenExchange({
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
            if ("authorizationHeader" in input) {
                return input.options.recipeImplementation.revokeToken({
                    token: input.token,
                    authorizationHeader: input.authorizationHeader,
                    userContext: input.userContext,
                });
            } else {
                return input.options.recipeImplementation.revokeToken({
                    token: input.token,
                    clientId: input.clientId,
                    clientSecret: input.clientSecret,
                    userContext: input.userContext,
                });
            }
        },
    };
}
exports.default = getAPIImplementation;
