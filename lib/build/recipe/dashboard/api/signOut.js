"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = signOut;
const utils_1 = require("../../../utils");
const querier_1 = require("../../../querier");
async function signOut(_, ___, options, userContext) {
    var _a;
    if (options.config.authMode === "api-key") {
        (0, utils_1.send200Response)(options.res, { status: "OK" });
    } else {
        const sessionIdFormAuthHeader =
            (_a = options.req.getHeaderValue("authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
        const sessionDeleteResponse = await querier.sendDeleteRequest(
            "/recipe/dashboard/session",
            undefined,
            { sessionId: sessionIdFormAuthHeader },
            userContext
        );
        (0, utils_1.send200Response)(options.res, sessionDeleteResponse);
    }
    return true;
}
