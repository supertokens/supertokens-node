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
const utils_1 = require("../../utils");
const error_1 = require("./error");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "emailpassword recipe", recipeInstance);
    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
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
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let override = {
        functions: (originalImplementation) => originalImplementation,
        apis: (originalImplementation) => originalImplementation,
    };
    if (config !== undefined && config.override !== undefined) {
        if (config.override.functions !== undefined) {
            override = Object.assign(Object.assign({}, override), { functions: config.override.functions });
        }
        if (config.override.apis !== undefined) {
            override = Object.assign(Object.assign({}, override), { apis: config.override.apis });
        }
    }
    return {
        sessionFeature,
        signUpFeature,
        signInFeature,
        resetPasswordUsingTokenFeature,
        signOutFeature,
        emailVerificationFeature,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function defaultSetSessionDataForSession(_, __, ___) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function defaultSetJwtPayloadForSession(_, __, ___) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function validateAndNormaliseSessionFeatureConfig(_, __, config) {
    let setJwtPayload =
        config === undefined || config.setJwtPayload === undefined
            ? defaultSetJwtPayloadForSession
            : config.setJwtPayload;
    let setSessionData =
        config === undefined || config.setSessionData === undefined
            ? defaultSetSessionDataForSession
            : config.setSessionData;
    return {
        setJwtPayload,
        setSessionData,
    };
}
function validateAndNormaliseEmailVerificationConfig(recipeInstance, _, config) {
    var _a;
    return (config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.emailVerificationFeature.disableDefaultImplementation,
              override: (_a = config.override) === null || _a === void 0 ? void 0 : _a.emailVerificationFeature,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.emailVerificationFeature.createAndSendCustomEmail === undefined
                      ? undefined
                      : (user, link) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _b;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_b =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _b === void 0
                                        ? void 0
                                        : _b.createAndSendCustomEmail) === undefined
                                ) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                            }),
              getEmailVerificationURL:
                  config.emailVerificationFeature.getEmailVerificationURL === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _c;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_c =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _c === void 0
                                        ? void 0
                                        : _c.getEmailVerificationURL) === undefined
                                ) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                            }),
              handlePostEmailVerification:
                  config.emailVerificationFeature.handlePostEmailVerification === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _d;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_d =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _d === void 0
                                        ? void 0
                                        : _d.handlePostEmailVerification) === undefined
                                ) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.emailVerificationFeature.handlePostEmailVerification(userInfo);
                            }),
          };
}
exports.validateAndNormaliseEmailVerificationConfig = validateAndNormaliseEmailVerificationConfig;
function validateAndNormaliseSignOutConfig(_, __, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    return {
        disableDefaultImplementation,
    };
}
function validateAndNormaliseResetPasswordUsingTokenConfig(_, appInfo, signUpConfig, config) {
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
function validateAndNormaliseSignInConfig(_, __, signUpConfig, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = normaliseSignInFormFields(signUpConfig.formFields);
    let handlePostSignIn =
        config === undefined || config.handlePostSignIn === undefined
            ? defaultHandlePostSignIn
            : config.handlePostSignIn;
    return {
        disableDefaultImplementation,
        formFields,
        handlePostSignIn,
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
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = normaliseSignUpFormFields(config === undefined ? undefined : config.formFields);
    let handlePostSignUp =
        config === undefined || config.handlePostSignUp === undefined
            ? defaultHandlePostSignUp
            : config.handlePostSignUp;
    return {
        disableDefaultImplementation,
        formFields,
        handlePostSignUp,
    };
}
function defaultValidator(_) {
    return __awaiter(this, void 0, void 0, function* () {
        return undefined;
    });
}
function defaultHandlePostSignUp(_, __) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultHandlePostSignIn(_) {
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
