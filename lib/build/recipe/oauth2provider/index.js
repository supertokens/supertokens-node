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
exports.validateOAuth2IdToken = exports.validateOAuth2AccessToken = exports.deleteOAuth2Client = exports.updateOAuth2Client = exports.createOAuth2Client = exports.getOAuth2Clients = exports.init = void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static async getOAuth2Clients(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getOAuth2Clients(input, utils_1.getUserContext(userContext));
    }
    static async createOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createOAuth2Client(input, utils_1.getUserContext(userContext));
    }
    static async updateOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateOAuth2Client(input, utils_1.getUserContext(userContext));
    }
    static async deleteOAuth2Client(input, userContext) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.deleteOAuth2Client(input, utils_1.getUserContext(userContext));
    }
    static validateOAuth2AccessToken(token, expectedAudience, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2AccessToken({
            token,
            expectedAudience,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static validateOAuth2IdToken(token, expectedAudience, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2IdToken({
            token,
            expectedAudience,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static revokeToken(token, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeToken({
            token,
            userContext: utils_1.getUserContext(userContext),
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.getOAuth2Clients = Wrapper.getOAuth2Clients;
exports.createOAuth2Client = Wrapper.createOAuth2Client;
exports.updateOAuth2Client = Wrapper.updateOAuth2Client;
exports.deleteOAuth2Client = Wrapper.deleteOAuth2Client;
exports.validateOAuth2AccessToken = Wrapper.validateOAuth2AccessToken;
exports.validateOAuth2IdToken = Wrapper.validateOAuth2IdToken;
