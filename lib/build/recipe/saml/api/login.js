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
exports.default = loginAPI;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../../thirdparty/error"));
async function loginAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.loginGET === undefined) {
        return false;
    }
    const clientId = options.req.getKeyValueFromQuery("client_id");
    const redirectURI = options.req.getKeyValueFromQuery("redirect_uri");
    const state = options.req.getKeyValueFromQuery("state");
    if (clientId === undefined || typeof clientId !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the clientId as a GET param",
        });
    }
    if (redirectURI === undefined || typeof redirectURI !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the redirectURI as a GET param",
        });
    }
    const response = await apiImplementation.loginGET({
        tenantId,
        clientId,
        redirectURI,
        state,
        options,
        userContext,
    });
    if (response.status === "OK") {
        (0, utils_1.sendRedirectResponse)(options.res, response.redirectURI);
    } else {
        // INVALID_CLIENT_ERROR
        (0, utils_1.sendRedirectResponse)(options.res, `${redirectURI}?error=invalid_client_error`);
    }
    return true;
}
