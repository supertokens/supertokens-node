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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeTokensBySessionHandle =
    exports.revokeTokensByClientId =
    exports.revokeToken =
    exports.createTokenForClientCredentials =
    exports.validateOAuth2RefreshToken =
    exports.validateOAuth2AccessToken =
    exports.deleteOAuth2Client =
    exports.updateOAuth2Client =
    exports.createOAuth2Client =
    exports.getOAuth2Clients =
    exports.getOAuth2Client =
    exports.init =
        void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static async getOAuth2Client(clientId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getOAuth2Client({
            clientId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getOAuth2Clients(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getOAuth2Clients(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(userContext) })
            );
    }
    static async createOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createOAuth2Client(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(userContext) })
            );
    }
    static async updateOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateOAuth2Client(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(userContext) })
            );
    }
    static async deleteOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.deleteOAuth2Client(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(userContext) })
            );
    }
    static validateOAuth2AccessToken(token, requirements, checkDatabase, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2AccessToken({
            token,
            requirements,
            checkDatabase,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static createTokenForClientCredentials(clientId, clientSecret, scope, audience, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.tokenExchange({
            body: {
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
                scope: scope === null || scope === void 0 ? void 0 : scope.join(" "),
                audience: audience,
            },
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async revokeToken(token, clientId, clientSecret, userContext) {
        let authorizationHeader = undefined;
        const normalisedUserContext = (0, utils_1.getUserContext)(userContext);
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const res = await recipeInterfaceImpl.getOAuth2Client({ clientId, userContext: normalisedUserContext });
        if (res.status !== "OK") {
            throw new Error(`Failed to get OAuth2 client with id ${clientId}: ${res.error}`);
        }
        const { tokenEndpointAuthMethod } = res.client;
        if (tokenEndpointAuthMethod === "none") {
            authorizationHeader = "Basic " + Buffer.from(clientId + ":").toString("base64");
        } else if (tokenEndpointAuthMethod === "client_secret_basic") {
            authorizationHeader = "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64");
        }
        if (authorizationHeader !== undefined) {
            return await recipeInterfaceImpl.revokeToken({
                token,
                authorizationHeader,
                userContext: normalisedUserContext,
            });
        }
        return await recipeInterfaceImpl.revokeToken({
            token,
            clientId,
            clientSecret,
            userContext: normalisedUserContext,
        });
    }
    static async revokeTokensByClientId(clientId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeTokensByClientId({
            clientId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async revokeTokensBySessionHandle(sessionHandle, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeTokensBySessionHandle({
            sessionHandle,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static validateOAuth2RefreshToken(token, scopes, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.introspectToken({
            token,
            scopes,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.getOAuth2Client = Wrapper.getOAuth2Client;
exports.getOAuth2Clients = Wrapper.getOAuth2Clients;
exports.createOAuth2Client = Wrapper.createOAuth2Client;
exports.updateOAuth2Client = Wrapper.updateOAuth2Client;
exports.deleteOAuth2Client = Wrapper.deleteOAuth2Client;
exports.validateOAuth2AccessToken = Wrapper.validateOAuth2AccessToken;
exports.validateOAuth2RefreshToken = Wrapper.validateOAuth2RefreshToken;
exports.createTokenForClientCredentials = Wrapper.createTokenForClientCredentials;
exports.revokeToken = Wrapper.revokeToken;
exports.revokeTokensByClientId = Wrapper.revokeTokensByClientId;
exports.revokeTokensBySessionHandle = Wrapper.revokeTokensBySessionHandle;
