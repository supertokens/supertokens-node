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
const constants_1 = require("./constants");
const passwordResetFunctions_1 = require("./passwordResetFunctions");
const backwardCompatibility_1 = require("./emaildelivery/services/backwardCompatibility");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    let signUpFeature = validateAndNormaliseSignupConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );
    let signInFeature = validateAndNormaliseSignInConfig(recipeInstance, appInfo, signUpFeature);
    let resetPasswordUsingTokenFeature = validateAndNormaliseResetPasswordUsingTokenConfig(
        recipeInstance,
        appInfo,
        signUpFeature,
        config === undefined ? undefined : config.resetPasswordUsingTokenFeature
    );
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    function getEmailDeliveryConfig(recipeImpl, isInServerlessEnv) {
        var _a;
        let emailService =
            (_a = config === null || config === void 0 ? void 0 : config.emailDelivery) === null || _a === void 0
                ? void 0
                : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(
                recipeImpl,
                appInfo,
                isInServerlessEnv,
                config === null || config === void 0 ? void 0 : config.resetPasswordUsingTokenFeature,
                config === null || config === void 0 ? void 0 : config.emailVerificationFeature
            );
        }
        return Object.assign(Object.assign({}, config === null || config === void 0 ? void 0 : config.emailDelivery), {
            /**
             * if we do
             * let emailDelivery = {
             *    service: emailService,
             *    ...config.emailDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
            service: emailService,
        });
    }
    return {
        signUpFeature,
        signInFeature,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature,
        override,
        getEmailDeliveryConfig,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function validateAndNormaliseEmailVerificationConfig(recipeInstance, _, config) {
    var _a, _b, _c;
    return {
        getEmailForUserId: recipeInstance.getEmailForUserId,
        override:
            (_a = config === null || config === void 0 ? void 0 : config.override) === null || _a === void 0
                ? void 0
                : _a.emailVerificationFeature,
        createAndSendCustomEmail:
            ((_b = config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === null ||
            _b === void 0
                ? void 0
                : _b.createAndSendCustomEmail) === undefined
                ? undefined
                : (user, link, userContext) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _d;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({
                              userId: user.id,
                              userContext,
                          });
                          if (
                              userInfo === undefined ||
                              ((_d =
                                  config === null || config === void 0 ? void 0 : config.emailVerificationFeature) ===
                                  null || _d === void 0
                                  ? void 0
                                  : _d.createAndSendCustomEmail) === undefined
                          ) {
                              throw new Error("Unknown User ID provided");
                          }
                          return yield config.emailVerificationFeature.createAndSendCustomEmail(
                              userInfo,
                              link,
                              userContext
                          );
                      }),
        getEmailVerificationURL:
            ((_c = config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === null ||
            _c === void 0
                ? void 0
                : _c.getEmailVerificationURL) === undefined
                ? undefined
                : (user, userContext) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _e;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({
                              userId: user.id,
                              userContext,
                          });
                          if (
                              userInfo === undefined ||
                              ((_e =
                                  config === null || config === void 0 ? void 0 : config.emailVerificationFeature) ===
                                  null || _e === void 0
                                  ? void 0
                                  : _e.getEmailVerificationURL) === undefined
                          ) {
                              throw new Error("Unknown User ID provided");
                          }
                          return yield config.emailVerificationFeature.getEmailVerificationURL(userInfo, userContext);
                      }),
    };
}
exports.validateAndNormaliseEmailVerificationConfig = validateAndNormaliseEmailVerificationConfig;
function validateAndNormaliseResetPasswordUsingTokenConfig(_, appInfo, signUpConfig, config) {
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
    return {
        formFieldsForPasswordResetForm,
        formFieldsForGenerateTokenForm,
        getResetPasswordURL,
    };
}
function normaliseSignInFormFields(formFields) {
    return formFields
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
}
function validateAndNormaliseSignInConfig(_, __, signUpConfig) {
    let formFields = normaliseSignInFormFields(signUpConfig.formFields);
    return {
        formFields,
    };
}
function normaliseSignUpFormFields(formFields) {
    let normalisedFormFields = [];
    if (formFields !== undefined) {
        formFields.forEach((field) => {
            if (field.id === constants_1.FORM_FIELD_PASSWORD_ID) {
                normalisedFormFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultPasswordValidator : field.validate,
                    optional: false,
                });
            } else if (field.id === constants_1.FORM_FIELD_EMAIL_ID) {
                normalisedFormFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultEmailValidator : field.validate,
                    optional: false,
                });
            } else {
                normalisedFormFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultValidator : field.validate,
                    optional: field.optional === undefined ? false : field.optional,
                });
            }
        });
    }
    if (normalisedFormFields.filter((field) => field.id === constants_1.FORM_FIELD_PASSWORD_ID).length === 0) {
        // no password field give by user
        normalisedFormFields.push({
            id: constants_1.FORM_FIELD_PASSWORD_ID,
            validate: defaultPasswordValidator,
            optional: false,
        });
    }
    if (normalisedFormFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID).length === 0) {
        // no email field give by user
        normalisedFormFields.push({
            id: constants_1.FORM_FIELD_EMAIL_ID,
            validate: defaultEmailValidator,
            optional: false,
        });
    }
    return normalisedFormFields;
}
exports.normaliseSignUpFormFields = normaliseSignUpFormFields;
function validateAndNormaliseSignupConfig(_, __, config) {
    let formFields = normaliseSignUpFormFields(config === undefined ? undefined : config.formFields);
    return {
        formFields,
    };
}
function defaultValidator(_) {
    return __awaiter(this, void 0, void 0, function* () {
        return undefined;
    });
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
