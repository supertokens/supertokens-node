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
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
async function verifyDeviceAPI(apiImplementation, options, userContext) {
    if (apiImplementation.verifyDevicePOST === undefined) {
        return false;
    }
    const session = await session_1.default.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext
    );
    const bodyParams = await options.req.getJSONBody();
    const deviceName = bodyParams.deviceName;
    const totp = bodyParams.totp;
    if (deviceName === undefined || typeof deviceName !== "string") {
        throw new Error("deviceName is required and must be a string");
    }
    if (totp === undefined || typeof totp !== "string") {
        throw new Error("totp is required and must be a string");
    }
    let response = await apiImplementation.verifyDevicePOST({
        deviceName,
        totp,
        options,
        session,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.default = verifyDeviceAPI;
