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
exports.getUserInfo = exports.exchangeAuthCodeForOAuthTokens = exports.getAuthorisationRedirectURL = exports.init = void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static async getAuthorisationRedirectURL(redirectURIOnProviderDashboard, userContext) {
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            userContext: utils_1.getUserContext(userContext),
        });
        return await recipeInterfaceImpl.getAuthorisationRedirectURL({
            providerConfig,
            redirectURIOnProviderDashboard,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static async exchangeAuthCodeForOAuthTokens(redirectURIInfo, userContext) {
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            userContext: utils_1.getUserContext(userContext),
        });
        return await recipeInterfaceImpl.exchangeAuthCodeForOAuthTokens({
            providerConfig,
            redirectURIInfo,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static async getUserInfo(oAuthTokens, userContext) {
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            userContext: utils_1.getUserContext(userContext),
        });
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserInfo({
            providerConfig,
            oAuthTokens,
            userContext: utils_1.getUserContext(userContext),
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.getAuthorisationRedirectURL = Wrapper.getAuthorisationRedirectURL;
exports.exchangeAuthCodeForOAuthTokens = Wrapper.exchangeAuthCodeForOAuthTokens;
exports.getUserInfo = Wrapper.getUserInfo;
