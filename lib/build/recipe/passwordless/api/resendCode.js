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
exports.default = resendCode;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
const authUtils_1 = require("../../../authUtils");
async function resendCode(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.resendCodePOST === undefined) {
        return false;
    }
    const body = await options.req.getJSONBody();
    const preAuthSessionId = body.preAuthSessionId;
    const deviceId = body.deviceId;
    if (preAuthSessionId === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide preAuthSessionId",
        });
    }
    if (deviceId === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide a deviceId",
        });
    }
    const shouldTryLinkingWithSessionUser = (0, utils_1.getNormalisedShouldTryLinkingWithSessionUserFlag)(
        options.req,
        body
    );
    const session = await authUtils_1.AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );
    let result = await apiImplementation.resendCodePOST({
        deviceId,
        preAuthSessionId,
        tenantId,
        session,
        shouldTryLinkingWithSessionUser,
        options,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
