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
exports.default = loginInfoGET;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../../../error"));
async function loginInfoGET(apiImplementation, options, userContext) {
    var _a, _b;
    if (apiImplementation.loginInfoGET === undefined) {
        return false;
    }
    const loginChallenge =
        (_a = options.req.getKeyValueFromQuery("login_challenge")) !== null && _a !== void 0
            ? _a
            : options.req.getKeyValueFromQuery("loginChallenge");
    if (loginChallenge === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Missing input param: loginChallenge",
        });
    }
    let response = await apiImplementation.loginInfoGET({
        options,
        loginChallenge,
        userContext,
    });
    if ("error" in response) {
        // We want to avoid returning a 401 to the frontend, as it may trigger a refresh loop
        if (response.statusCode === 401) {
            response.statusCode = 400;
        }
        (0, utils_1.sendNon200Response)(options.res, (_b = response.statusCode) !== null && _b !== void 0 ? _b : 400, {
            error: response.error,
            error_description: response.errorDescription,
        });
    } else {
        (0, utils_1.send200Response)(options.res, response);
    }
    return true;
}
