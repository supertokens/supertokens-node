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
exports.default = signUpAPI;
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
const error_1 = __importDefault(require("../error"));
const authUtils_1 = require("../../../authUtils");
async function signUpAPI(apiImplementation, tenantId, options, userContext) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536
    if (apiImplementation.signUpPOST === undefined) {
        return false;
    }
    const requestBody = await options.req.getJSONBody();
    // step 1
    let formFields = await (0, utils_2.validateFormFieldsOrThrowError)(
        options.config.signUpFeature.formFields,
        requestBody.formFields,
        tenantId,
        userContext
    );
    const shouldTryLinkingWithSessionUser = (0, utils_1.getNormalisedShouldTryLinkingWithSessionUserFlag)(
        options.req,
        requestBody
    );
    const session = await authUtils_1.AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );
    if (session !== undefined) {
        tenantId = session.getTenantId();
    }
    let result = await apiImplementation.signUpPOST({
        formFields,
        tenantId,
        session,
        shouldTryLinkingWithSessionUser,
        options,
        userContext: userContext,
    });
    if (result.status === "OK") {
        (0, utils_1.send200Response)(
            options.res,
            Object.assign(
                { status: "OK" },
                (0, utils_1.getBackwardsCompatibleUserInfo)(options.req, result, userContext)
            )
        );
    } else if (result.status === "GENERAL_ERROR") {
        (0, utils_1.send200Response)(options.res, result);
    } else if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        throw new error_1.default({
            type: error_1.default.FIELD_ERROR,
            payload: [
                {
                    id: "email",
                    error: "This email already exists. Please sign in instead.",
                },
            ],
            message: "Error in input formFields",
        });
    } else {
        (0, utils_1.send200Response)(options.res, result);
    }
    return true;
}
