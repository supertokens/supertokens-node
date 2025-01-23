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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tokenPOST;
const utils_1 = require("../../../utils");
async function tokenPOST(apiImplementation, options, userContext) {
    var _a;
    if (apiImplementation.tokenPOST === undefined) {
        return false;
    }
    const authorizationHeader = options.req.getHeaderValue("authorization");
    let response = await apiImplementation.tokenPOST({
        authorizationHeader,
        options,
        body: await options.req.getBodyAsJSONOrFormData(),
        userContext,
    });
    if ("error" in response) {
        // We do not need to normalize as this is not expected to be called by frontends where interception is enabled
        (0, utils_1.sendNon200Response)(options.res, (_a = response.statusCode) !== null && _a !== void 0 ? _a : 400, {
            error: response.error,
            error_description: response.errorDescription,
        });
    } else {
        (0, utils_1.send200Response)(options.res, response);
    }
    return true;
}
