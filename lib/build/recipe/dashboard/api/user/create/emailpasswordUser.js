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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailPasswordUser = void 0;
const error_1 = __importDefault(require("../../../../../error"));
const emailpassword_1 = __importDefault(require("../../../../emailpassword"));
const recipe_1 = __importDefault(require("../../../../emailpassword/recipe"));
const createEmailPasswordUser = async (_, tenantId, options, userContext) => {
    let emailPassword = undefined;
    try {
        emailPassword = recipe_1.default.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const requestBody = await options.req.getJSONBody();
    const email = requestBody.email;
    const password = requestBody.password;
    if (email === undefined || typeof email !== "string") {
        throw new error_1.default({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (password === undefined || typeof password !== "string") {
        throw new error_1.default({
            message: "Required parameter 'password' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const emailFormField = emailPassword.config.signUpFeature.formFields.find((field) => field.id === "email"); // using non-null assertion as the field with id email will always exists in formFields array.
    const validateEmailError = await emailFormField.validate(email, tenantId, userContext);
    if (validateEmailError !== undefined) {
        return {
            status: "EMAIL_VALIDATION_ERROR",
            message: validateEmailError,
        };
    }
    const passwordFormField = emailPassword.config.signUpFeature.formFields.find((field) => field.id === "password"); // using non-null assertion as the field with id password will always exists in formFields array.
    const validatePasswordError = await passwordFormField.validate(password, tenantId, userContext);
    if (validatePasswordError !== undefined) {
        return {
            status: "PASSWORD_VALIDATION_ERROR",
            message: validatePasswordError,
        };
    }
    const response = await emailpassword_1.default.signUp(tenantId, email, password);
    // For some reason TS complains if I check the other status codes then throw...
    if (response.status === "OK" || response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return response;
    } else {
        throw new Error(
            "This should never happen: EmailPassword.signUp threw a session user related error without passing a session"
        );
    }
};
exports.createEmailPasswordUser = createEmailPasswordUser;
