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
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
async function signInAPI(apiImplementation, tenantId, options, userContext) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/20#issuecomment-710346362
    if (apiImplementation.signInPOST === undefined) {
        return false;
    }
    // step 1
    let formFields = await utils_2.validateFormFieldsOrThrowError(
        options.config.signInFeature.formFields,
        (await options.req.getJSONBody()).formFields,
        tenantId,
        userContext
    );
    let result = await apiImplementation.signInPOST({
        formFields,
        tenantId,
        options,
        userContext,
    });
    if (result.status === "OK") {
        utils_1.send200Response(
            options.res,
            Object.assign({ status: "OK" }, utils_1.getBackwardsCompatibleUserInfo(options.req, result))
        );
    } else {
        utils_1.send200Response(options.res, result);
    }
    return true;
}
exports.default = signInAPI;
