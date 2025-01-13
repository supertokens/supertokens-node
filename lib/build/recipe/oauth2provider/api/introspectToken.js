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
exports.default = introspectTokenPOST;
const utils_1 = require("../../../utils");
async function introspectTokenPOST(apiImplementation, options, userContext) {
    if (apiImplementation.introspectTokenPOST === undefined) {
        return false;
    }
    const body = await options.req.getBodyAsJSONOrFormData();
    if (body.token === undefined) {
        (0, utils_1.sendNon200ResponseWithMessage)(options.res, "token is required in the request body", 400);
        return true;
    }
    const scopes = body.scope ? body.scope.split(" ") : [];
    let response = await apiImplementation.introspectTokenPOST({
        options,
        token: body.token,
        scopes,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, response);
    return true;
}
