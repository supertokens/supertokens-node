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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.exchangeAuthCodeForOAuthTokens = exports.init = void 0;
const utils_1 = require("../../utils");
const jwt_1 = require("../session/jwt");
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static async exchangeAuthCodeForOAuthTokens(redirectURIInfo, clientId, userContext) {
        let normalisedClientId = clientId;
        const instance = recipe_1.default.getInstanceOrThrowError();
        const recipeInterfaceImpl = instance.recipeInterfaceImpl;
        const normalisedUserContext = utils_1.getUserContext(userContext);
        if (normalisedClientId === undefined) {
            if (instance.config.providerConfigs.length > 1) {
                throw new Error("clientId is required if there are more than one provider configs defined");
            }
            normalisedClientId = instance.config.providerConfigs[0].clientId;
        }
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            clientId: normalisedClientId,
            userContext: normalisedUserContext,
        });
        return await recipeInterfaceImpl.exchangeAuthCodeForOAuthTokens({
            providerConfig,
            redirectURIInfo,
            userContext: normalisedUserContext,
        });
    }
    static async getUserInfo(oAuthTokens, userContext) {
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const normalisedUserContext = utils_1.getUserContext(userContext);
        if (oAuthTokens.access_token === undefined) {
            throw new Error("access_token is required to get user info");
        }
        const preparseJWTInfo = jwt_1.parseJWTWithoutSignatureVerification(oAuthTokens.access_token);
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            clientId: preparseJWTInfo.payload.client_id,
            userContext: normalisedUserContext,
        });
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserInfo({
            providerConfig,
            oAuthTokens,
            userContext: normalisedUserContext,
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.exchangeAuthCodeForOAuthTokens = Wrapper.exchangeAuthCodeForOAuthTokens;
exports.getUserInfo = Wrapper.getUserInfo;
