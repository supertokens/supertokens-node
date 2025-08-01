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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = loginMethodsAPI;
const utils_1 = require("../../../utils");
async function loginMethodsAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.loginMethodsGET === undefined) {
        return false;
    }
    const clientType = options.req.getKeyValueFromQuery("clientType");
    const result = await apiImplementation.loginMethodsGET({ tenantId, clientType, options, userContext });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
