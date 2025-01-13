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
exports.default = signOutAPI;
const utils_1 = require("../../../utils");
const sessionRequestFunctions_1 = require("../sessionRequestFunctions");
async function signOutAPI(apiImplementation, options, userContext) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/34#issuecomment-717958537
    if (apiImplementation.signOutPOST === undefined) {
        return false;
    }
    const session = await (0, sessionRequestFunctions_1.getSessionFromRequest)({
        req: options.req,
        res: options.res,
        config: options.config,
        recipeInterfaceImpl: options.recipeImplementation,
        options: {
            sessionRequired: true,
            overrideGlobalClaimValidators: () => [],
        },
        userContext,
    });
    if (session === undefined) {
        throw new Error("should never come here"); // Session required is true
    }
    let result = await apiImplementation.signOutPOST({
        options,
        session,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
