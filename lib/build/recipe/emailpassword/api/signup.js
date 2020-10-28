"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const session_1 = require("../../session");
const utils_2 = require("../../../utils");
function signUpAPI(recipeInstance, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536
        // step 1
        let formFields = yield validateFormFieldsOrThrowError(recipeInstance, req.body.formFields);
        // step 2
        let email = utils_1.normaliseEmail(formFields.filter((f) => f.id === constants_1.FORM_FIELD_EMAIL_ID)[0].value);
        let password = formFields.filter((f) => f.id === constants_1.FORM_FIELD_PASSWORD_ID)[0].value;
        // step 3. Errors for this are caught by the error handler
        let user = yield recipeInstance.signUp(email, password);
        // set 4
        yield recipeInstance.config.signUpFeature.handleCustomFormFields(
            user,
            formFields.filter(
                (field) =>
                    field.id !== constants_1.FORM_FIELD_EMAIL_ID && field.id !== constants_1.FORM_FIELD_PASSWORD_ID
            )
        );
        // step 5
        yield session_1.default.createNewSession(res, user.id);
        return utils_2.send200Response(res, {
            status: "OK",
            user,
        });
    });
}
exports.signUpAPI = signUpAPI;
function validateFormFieldsOrThrowError(recipeInstance, formFieldsRaw) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: first syntax validation
        // TODO: check that email and password exist
        // TODO: then run validators through them.
        return [];
    });
}
//# sourceMappingURL=signup.js.map
