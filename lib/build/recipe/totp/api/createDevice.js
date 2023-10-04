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
const session_1 = __importDefault(require("../../session"));
async function createDevice(apiImplementation, options, userContext) {
    if (apiImplementation.createDevicePOST === undefined) {
        return false;
    }
    // Device creation is only be allowed if you've completed all factors OR have no devices yet.
    // We have to remove claim validators here because we want to allow the user to create a device
    // if they don't have any. But later in createDevicePOST, before actually calling the create
    // device core API, we use assertClaims to ensure that if they have any devices, they must
    // have completed all factors.
    let session = await session_1.default.getSession(options.req, options.res, {
        overrideGlobalClaimValidators: (_) => [],
    });
    let { deviceName } = await options.req.getJSONBody();
    let result = await apiImplementation.createDevicePOST({
        session,
        deviceName,
        options,
        userContext,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = createDevice;
