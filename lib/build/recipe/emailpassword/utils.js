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
const types_1 = require("./types");
const constants_1 = require("./constants");
const passwordResetFunctions_1 = require("./passwordResetFunctions");
const emailVerificationFunctions_1 = require("./emailVerificationFunctions");
const utils_1 = require("../../utils");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(
        config,
        types_1.InputSchema,
        "emailpassword recipe",
        recipeInstance.getRecipeId()
    );
    let signUpFeature = validateAndNormaliseSignupConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );
    let signInFeature = validateAndNormaliseSignInConfig(
        recipeInstance,
        appInfo,
        signUpFeature,
        config === undefined ? undefined : config.signInFeature
    );
    let resetPasswordUsingTokenFeature = validateAndNormaliseResetPasswordUsingTokenConfig(
        recipeInstance,
        appInfo,
        signUpFeature,
        config === undefined ? undefined : config.resetPasswordUsingTokenFeature
    );
    let signOutFeature = validateAndNormaliseSignOutConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signOutFeature
    );
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.emailVerificationFeature
    );
    return {
        signUpFeature,
        signInFeature,
        resetPasswordUsingTokenFeature,
        signOutFeature,
        emailVerificationFeature,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    return {
        disableDefaultImplementation,
    };
}
function validateAndNormaliseResetPasswordUsingTokenConfig(recipeInstance, appInfo, signUpConfig, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFieldsForPasswordResetForm = signUpConfig.formFields
        .filter((filter) => filter.id === constants_1.FORM_FIELD_PASSWORD_ID)
        .map((field) => {
            return {
                id: field.id,
                validate: field.validate,
                optional: false,
            };
        });
    let formFieldsForGenerateTokenForm = signUpConfig.formFields
        .filter((filter) => filter.id === constants_1.FORM_FIELD_EMAIL_ID)
        .map((field) => {
            return {
                id: field.id,
                validate: field.validate,
                optional: false,
            };
        });
    let getResetPasswordURL =
        config === undefined || config.getResetPasswordURL === undefined
            ? passwordResetFunctions_1.getResetPasswordURL(appInfo)
            : config.getResetPasswordURL;
    let createAndSendCustomEmail =
        config === undefined || config.createAndSendCustomEmail === undefined
            ? passwordResetFunctions_1.createAndSendCustomEmail(appInfo)
            : config.createAndSendCustomEmail;
    return {
        disableDefaultImplementation,
        formFieldsForPasswordResetForm,
        formFieldsForGenerateTokenForm,
        getResetPasswordURL,
        createAndSendCustomEmail,
    };
}
function validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let getEmailVerificationURL =
        config === undefined || config.getEmailVerificationURL === undefined
            ? emailVerificationFunctions_1.getEmailVerificationURL(appInfo)
            : config.getEmailVerificationURL;
    let createAndSendCustomEmail =
        config === undefined || config.createAndSendCustomEmail === undefined
            ? emailVerificationFunctions_1.createAndSendCustomEmail(appInfo)
            : config.createAndSendCustomEmail;
    let handlePostEmailVerification =
        config === undefined || config.handlePostEmailVerification === undefined
            ? (user) => __awaiter(this, void 0, void 0, function* () {})
            : config.handlePostEmailVerification;
    return {
        disableDefaultImplementation,
        getEmailVerificationURL,
        createAndSendCustomEmail,
        handlePostEmailVerification,
    };
}
function validateAndNormaliseSignInConfig(recipeInstance, appInfo, signUpConfig, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = signUpConfig.formFields
        .filter(
            (filter) =>
                filter.id === constants_1.FORM_FIELD_EMAIL_ID || filter.id === constants_1.FORM_FIELD_PASSWORD_ID
        )
        .map((field) => {
            return {
                id: field.id,
                // see issue: https://github.com/supertokens/supertokens-node/issues/36
                validate: field.id === constants_1.FORM_FIELD_EMAIL_ID ? field.validate : defaultValidator,
                optional: false,
            };
        });
    return {
        disableDefaultImplementation,
        formFields,
    };
}
function validateAndNormaliseSignupConfig(recipeInstance, appInfo, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = [];
    if (config !== undefined && config.formFields !== undefined) {
        config.formFields.forEach((field) => {
            if (field.id === constants_1.FORM_FIELD_PASSWORD_ID) {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultPasswordValidator : field.validate,
                    optional: false,
                });
            } else if (field.id === constants_1.FORM_FIELD_EMAIL_ID) {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultEmailValidator : field.validate,
                    optional: false,
                });
            } else {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultValidator : field.validate,
                    optional: field.optional === undefined ? false : field.optional,
                });
            }
        });
    }
    if (formFields.filter((field) => field.id === constants_1.FORM_FIELD_PASSWORD_ID).length === 0) {
        // no password field give by user
        formFields.push({
            id: constants_1.FORM_FIELD_PASSWORD_ID,
            validate: defaultPasswordValidator,
            optional: false,
        });
    }
    if (formFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID).length === 0) {
        // no email field give by user
        formFields.push({
            id: constants_1.FORM_FIELD_EMAIL_ID,
            validate: defaultEmailValidator,
            optional: false,
        });
    }
    let handleCustomFormFieldsPostSignUp =
        config === undefined || config.handleCustomFormFieldsPostSignUp === undefined
            ? defaultHandleCustomFormFieldsPostSignUp
            : config.handleCustomFormFieldsPostSignUp;
    return {
        disableDefaultImplementation,
        formFields,
        handleCustomFormFieldsPostSignUp,
    };
}
function defaultValidator(value) {
    return __awaiter(this, void 0, void 0, function* () {
        return undefined;
    });
}
function defaultHandleCustomFormFieldsPostSignUp(user, formFields) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultPasswordValidator(value) {
    return __awaiter(this, void 0, void 0, function* () {
        // length >= 8 && < 100
        // must have a number and a character
        // as per https://github.com/supertokens/supertokens-auth-react/issues/5#issuecomment-709512438
        if (typeof value !== "string") {
            return "Development bug: Please make sure the password field yields a string";
        }
        if (value.length < 8) {
            return "Password must contain at least 8 characters, including a number";
        }
        if (value.length >= 100) {
            return "Password's length must be lesser than 100 characters";
        }
        if (value.match(/^.*[A-Za-z]+.*$/) === null) {
            return "Password must contain at least one alphabet";
        }
        if (value.match(/^.*[0-9]+.*$/) === null) {
            return "Password must contain at least one number";
        }
        return undefined;
    });
}
exports.defaultPasswordValidator = defaultPasswordValidator;
function defaultEmailValidator(value) {
    return __awaiter(this, void 0, void 0, function* () {
        // We check if the email syntax is correct
        // As per https://github.com/supertokens/supertokens-auth-react/issues/5#issuecomment-709512438
        // Regex from https://stackoverflow.com/a/46181/3867175
        if (typeof value !== "string") {
            return "Development bug: Please make sure the email field yields a string";
        }
        if (
            value.match(
                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            ) === null
        ) {
            return "Email is invalid";
        }
        return undefined;
    });
}
exports.defaultEmailValidator = defaultEmailValidator;
//# sourceMappingURL=utils.js.map
