"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
async function registerOptions(apiImplementation, tenantId, options, userContext) {
    var _a;
    if (apiImplementation.registerOptionsPOST === undefined) {
        return false;
    }
    const requestBody = await options.req.getJSONBody();
    const email = (_a = requestBody.email) === null || _a === void 0 ? void 0 : _a.trim();
    const recoverAccountToken = requestBody.recoverAccountToken;
    if (
        (email === undefined || typeof email !== "string") &&
        (recoverAccountToken === undefined || typeof recoverAccountToken !== "string")
    ) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the email or the recover account token",
        });
    }
    if (email !== undefined) {
        const validateError = await options.config.validateEmailAddress(email, tenantId, userContext);
        if (validateError !== undefined) {
            utils_1.send200Response(options.res, {
                status: "INVALID_EMAIL_ERROR",
                err: validateError,
            });
            return true;
        }
    }
    const result = await apiImplementation.registerOptionsPOST({
        email,
        recoverAccountToken,
        tenantId,
        options,
        userContext,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = registerOptions;
