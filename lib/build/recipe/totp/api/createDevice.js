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
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
async function createDeviceAPI(apiImplementation, options, userContext) {
    if (apiImplementation.createDevicePOST === undefined) {
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
    const period = bodyParams.period;
    const skew = bodyParams.skew;
    if (deviceName !== undefined && typeof deviceName !== "string") {
        throw new Error("deviceName must be a string");
    }
    if (period !== undefined && typeof period !== "number") {
        throw new Error("period must be a number");
    }
    if (skew !== undefined && typeof skew !== "number") {
        throw new Error("skew must be a number");
    }
    let response = await apiImplementation.createDevicePOST({
        deviceName,
        period,
        skew,
        options,
        session,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.default = createDeviceAPI;
