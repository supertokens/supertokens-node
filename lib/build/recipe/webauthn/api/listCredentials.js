"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.default = listCredentialsAPI;
const utils_1 = require("../../../utils");
async function listCredentialsAPI(stInstance, apiImplementation, _, options, userContext) {
    if (apiImplementation.listCredentialsGET === undefined) {
        return false;
    }
    const session = await stInstance.getRecipeInstanceOrThrow("session").getSession({
        req: options.req,
        res: options.res,
        options: { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext,
    });
    const result = await apiImplementation.listCredentialsGET({
        options,
        userContext: userContext,
        session: session,
    });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
