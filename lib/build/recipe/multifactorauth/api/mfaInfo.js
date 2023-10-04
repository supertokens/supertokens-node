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
async function mfaInfo(apiImplementation, tenantId, options, userContext) {
    let result;
    if (apiImplementation.mfaInfoGET === undefined) {
        return false;
    }
    const session = await session_1.default.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext
    );
    let response = await apiImplementation.mfaInfoGET({
        tenantId,
        options,
        session,
        userContext,
    });
    if (response.status === "OK") {
        // if there is a new session, it will be
        // automatically added to the response by the createNewSession function call
        // inside the verifyEmailPOST function.
        result = { status: "OK" };
    } else {
        result = response;
    }
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = mfaInfo;
