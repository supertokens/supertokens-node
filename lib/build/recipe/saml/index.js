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
exports.getUserInfo =
    exports.verifySAMLResponse =
    exports.createLoginRequest =
    exports.removeClient =
    exports.listClients =
    exports.createOrUpdateClient =
    exports.Error =
    exports.init =
        void 0;
// import { getUserContext } from "../../utils";
const error_1 = __importDefault(require("../../error"));
const recipe_1 = __importDefault(require("./recipe"));
const utils_1 = require("../../utils");
class Wrapper {
    static createOrUpdateClient(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createOrUpdateClient(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static listClients(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listClients(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static removeClient(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.removeClient(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static createLoginRequest(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createLoginRequest(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static verifySAMLResponse(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.verifySAMLResponse(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static getUserInfo(input) {
        recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserInfo(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createOrUpdateClient = Wrapper.createOrUpdateClient;
exports.listClients = Wrapper.listClients;
exports.removeClient = Wrapper.removeClient;
exports.createLoginRequest = Wrapper.createLoginRequest;
exports.verifySAMLResponse = Wrapper.verifySAMLResponse;
exports.getUserInfo = Wrapper.getUserInfo;
