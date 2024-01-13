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
const thirdpartyemailpassword_1 = __importDefault(require("../../../../thirdpartyemailpassword"));
const recipe_1 = __importDefault(require("../../../../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../../../../thirdpartyemailpassword/recipe"));
const createEmailPasswordUser = async (_, tenantId, options, userContext) => {
    let emailPasswordOrThirdpartyEmailPassword = undefined;
    try {
        emailPasswordOrThirdpartyEmailPassword = recipe_1.default.getInstanceOrThrowError();
    } catch (error) {
        try {
            emailPasswordOrThirdpartyEmailPassword = recipe_2.default.getInstanceOrThrowError();
        } catch (_a) {
            return {
                status: "FEATURE_NOT_ENABLED_ERROR",
            };
        }
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
    const emailFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "email"
    ); // using non-null assertion as the field with id email will always exists in formFields array.
    const validateEmailError = await emailFormField.validate(email, tenantId, userContext);
    if (validateEmailError !== undefined) {
        return {
            status: "EMAIL_VALIDATION_ERROR",
            message: validateEmailError,
        };
    }
    const passwordFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "password"
    ); // using non-null assertion as the field with id password will always exists in formFields array.
    const validatePasswordError = await passwordFormField.validate(password, tenantId, userContext);
    if (validatePasswordError !== undefined) {
        return {
            status: "PASSWORD_VALIDATION_ERROR",
            message: validatePasswordError,
        };
    }
    if (emailPasswordOrThirdpartyEmailPassword.getRecipeId() === "emailpassword") {
        const response = await emailpassword_1.default.signUp(tenantId, email, password);
        return response;
    } else {
        // not checking explicitly if the recipeId is thirdpartyemailpassword or not because at this point of time it should be thirdpartyemailpassword.
        const response = await thirdpartyemailpassword_1.default.emailPasswordSignUp(tenantId, email, password);
        return response;
    }
};
exports.createEmailPasswordUser = createEmailPasswordUser;
