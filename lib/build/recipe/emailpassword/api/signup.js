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
const constants_1 = require("../constants");
const session_1 = require("../../session");
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
const error_1 = require("../error");
function signUpAPI(recipeInstance, req, res, _) {
    return __awaiter(this, void 0, void 0, function* () {
        // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536
        // step 1
        let formFields = yield utils_2.validateFormFieldsOrThrowError(
            recipeInstance,
            recipeInstance.config.signUpFeature.formFields,
            req.body.formFields
        );
        let email = formFields.filter((f) => f.id === constants_1.FORM_FIELD_EMAIL_ID)[0].value;
        let password = formFields.filter((f) => f.id === constants_1.FORM_FIELD_PASSWORD_ID)[0].value;
        // step 2. Errors for this are caught by the error handler
        let user = yield recipeInstance.signUp(email, password);
        // set 3
        yield recipeInstance.config.signUpFeature.handlePostSignUp(
            user,
            formFields.filter(
                (field) =>
                    field.id !== constants_1.FORM_FIELD_EMAIL_ID && field.id !== constants_1.FORM_FIELD_PASSWORD_ID
            )
        );
        let jwtPayloadPromise = recipeInstance.config.sessionFeature.setJwtPayload(
            user,
            formFields.filter(
                (field) =>
                    field.id !== constants_1.FORM_FIELD_EMAIL_ID && field.id !== constants_1.FORM_FIELD_PASSWORD_ID
            ),
            "signup"
        );
        let sessionDataPromise = recipeInstance.config.sessionFeature.setSessionData(
            user,
            formFields.filter(
                (field) =>
                    field.id !== constants_1.FORM_FIELD_EMAIL_ID && field.id !== constants_1.FORM_FIELD_PASSWORD_ID
            ),
            "signup"
        );
        let jwtPayload = undefined;
        let sessionData = undefined;
        try {
            jwtPayload = yield jwtPayloadPromise;
            sessionData = yield sessionDataPromise;
        } catch (err) {
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: err,
                },
                recipeInstance
            );
        }
        // step 4
        yield session_1.default.createNewSession(res, user.id, jwtPayload, sessionData);
        return utils_1.send200Response(res, {
            status: "OK",
            user,
        });
    });
}
exports.default = signUpAPI;
//# sourceMappingURL=signup.js.map
