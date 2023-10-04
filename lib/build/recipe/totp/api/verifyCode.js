"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
const session_1 = __importDefault(require("../../session"));
async function verifyCode(apiImplementation, options, userContext) {
    if (apiImplementation.verifyCodePOST === undefined) {
        return false;
    }
    let session = await session_1.default.getSession(options.req, options.res, {
        overrideGlobalClaimValidators: (_) => [],
    });
    const { totp } = await options.req.getJSONBody();
    if (totp === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide totp",
        });
    }
    let result = await apiImplementation.verifyCodePOST({
        session,
        totp,
        options,
        userContext,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = verifyCode;
