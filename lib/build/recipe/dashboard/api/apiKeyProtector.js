"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = apiKeyProtector;
/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
const error_1 = __importDefault(require("../error"));
const utils_1 = require("../utils");
async function apiKeyProtector(apiFunction, input) {
    const options = input.options;
    const userContext = input.userContext;
    let shouldAllowAccess = false;
    try {
        shouldAllowAccess = await options.recipeImplementation.shouldAllowAccess({
            req: options.req,
            config: options.config,
            userContext,
        });
    } catch (e) {
        if (error_1.default.isErrorFromSuperTokens(e) && e.type === error_1.default.OPERATION_NOT_ALLOWED) {
            options.res.setStatusCode(403);
            options.res.sendJSONResponse({
                message: e.message,
            });
            return true;
        }
        throw e;
    }
    if (!shouldAllowAccess) {
        (0, utils_1.sendUnauthorisedAccess)(options.res);
        return true;
    }
    const response = await apiFunction(input);
    options.res.sendJSONResponse(response);
    return true;
}
