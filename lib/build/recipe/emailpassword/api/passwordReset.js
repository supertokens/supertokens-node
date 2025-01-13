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
exports.default = passwordReset;
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
const error_1 = __importDefault(require("../error"));
async function passwordReset(apiImplementation, tenantId, options, userContext) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/22#issuecomment-710512442
    if (apiImplementation.passwordResetPOST === undefined) {
        return false;
    }
    const requestBody = await options.req.getJSONBody();
    // step 1: We need to do this here even though the update emailpassword recipe function would do this cause:
    // - we want to throw this error before consuming the token, so that the user can try again
    // - there is a case in the api impl where we create a new user, and we want to assign
    //      a password that meets the password policy.
    let formFields = await (0, utils_2.validateFormFieldsOrThrowError)(
        options.config.resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm,
        requestBody.formFields,
        tenantId,
        userContext
    );
    let token = requestBody.token;
    if (token === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the password reset token",
        });
    }
    if (typeof token !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "The password reset token must be a string",
        });
    }
    let result = await apiImplementation.passwordResetPOST({
        formFields,
        token,
        tenantId,
        options,
        userContext,
    });
    if (result.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
        // this error will be caught by the recipe error handler, just
        // like it's done in the validateFormFieldsOrThrowError function above.
        throw new error_1.default({
            type: error_1.default.FIELD_ERROR,
            payload: [
                {
                    id: "password",
                    error: result.failureReason,
                },
            ],
            message: "Error in input formFields",
        });
    }
    (0, utils_1.send200Response)(
        options.res,
        result.status === "OK"
            ? {
                  status: "OK",
              }
            : result
    );
    return true;
}
