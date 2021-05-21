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

import Recipe from "./recipe";
import {
    TypeInput,
    TypeNormalisedInput,
    User,
    TypeInputSignUp,
    TypeNormalisedInputSignUp,
    TypeNormalisedInputSignIn,
    TypeInputResetPasswordUsingTokenFeature,
    TypeNormalisedInputResetPasswordUsingTokenFeature,
    NormalisedFormField,
    InputSchema,
    TypeInputSessionFeature,
    TypeNormalisedInputSessionFeature,
    TypeFormField,
    TypeInputFormField,
    TypeInputSignIn,
    APIInterface,
} from "./types";
import { NormalisedAppinfo } from "../../types";
import { FORM_FIELD_EMAIL_ID, FORM_FIELD_PASSWORD_ID } from "./constants";
import { TypeNormalisedInputSignOutFeature, TypeInputSignOutFeature, RecipeInterface } from "./types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import {
    getResetPasswordURL as defaultGetResetPasswordURL,
    createAndSendCustomEmail as defaultCreateAndSendCustomPasswordResetEmail,
} from "./passwordResetFunctions";
import { validateTheStructureOfUserInput } from "../../utils";
import STError from "./error";
import { RecipeImplementation, APIImplementation } from "./";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "emailpassword recipe", recipeInstance);

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

    let override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    } = {
        functions: (originalImplementation: RecipeImplementation) => originalImplementation,
        apis: (originalImplementation: APIImplementation) => originalImplementation,
    };

    if (config !== undefined && config.override !== undefined) {
        if (config.override.functions !== undefined) {
            override = {
                ...override,
                functions: config.override.functions,
            };
        }
        if (config.override.apis !== undefined) {
            override = {
                ...override,
                apis: config.override.apis,
            };
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

async function defaultSetSessionDataForSession(_: User, __: TypeFormField[], ___: "signin" | "signup") {
    return {};
}

async function defaultSetJwtPayloadForSession(_: User, __: TypeFormField[], ___: "signin" | "signup") {
    return {};
}

function validateAndNormaliseSessionFeatureConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSessionFeature
): TypeNormalisedInputSessionFeature {
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

export function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInputEmailVerification {
    return config?.emailVerificationFeature === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.emailVerificationFeature.disableDefaultImplementation,
              override: config.override?.emailVerificationFeature,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.emailVerificationFeature.createAndSendCustomEmail === undefined
                      ? undefined
                      : async (user, link) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (
                                userInfo === undefined ||
                                config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                            ) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                        },
              getEmailVerificationURL:
                  config.emailVerificationFeature.getEmailVerificationURL === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (
                                userInfo === undefined ||
                                config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                            ) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                        },
              handlePostEmailVerification:
                  config.emailVerificationFeature.handlePostEmailVerification === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (
                                userInfo === undefined ||
                                config?.emailVerificationFeature?.handlePostEmailVerification === undefined
                            ) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.emailVerificationFeature.handlePostEmailVerification(userInfo);
                        },
          };
}

function validateAndNormaliseSignOutConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSignOutFeature
): TypeNormalisedInputSignOutFeature {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    return {
        disableDefaultImplementation,
    };
}

function validateAndNormaliseResetPasswordUsingTokenConfig(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    signUpConfig: TypeNormalisedInputSignUp,
    config?: TypeInputResetPasswordUsingTokenFeature
): TypeNormalisedInputResetPasswordUsingTokenFeature {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    let formFieldsForPasswordResetForm: NormalisedFormField[] = signUpConfig.formFields
        .filter((filter) => filter.id === FORM_FIELD_PASSWORD_ID)
        .map((field) => {
            return {
                id: field.id,
                validate: field.validate,
                optional: false,
            };
        });

    let formFieldsForGenerateTokenForm: NormalisedFormField[] = signUpConfig.formFields
        .filter((filter) => filter.id === FORM_FIELD_EMAIL_ID)
        .map((field) => {
            return {
                id: field.id,
                validate: field.validate,
                optional: false,
            };
        });

    let getResetPasswordURL =
        config === undefined || config.getResetPasswordURL === undefined
            ? defaultGetResetPasswordURL(appInfo)
            : config.getResetPasswordURL;

    let createAndSendCustomEmail =
        config === undefined || config.createAndSendCustomEmail === undefined
            ? defaultCreateAndSendCustomPasswordResetEmail(appInfo)
            : config.createAndSendCustomEmail;

    return {
        disableDefaultImplementation,
        formFieldsForPasswordResetForm,
        formFieldsForGenerateTokenForm,
        getResetPasswordURL,
        createAndSendCustomEmail,
    };
}

function normaliseSignInFormFields(formFields: NormalisedFormField[]) {
    return formFields
        .filter((filter) => filter.id === FORM_FIELD_EMAIL_ID || filter.id === FORM_FIELD_PASSWORD_ID)
        .map((field) => {
            return {
                id: field.id,
                // see issue: https://github.com/supertokens/supertokens-node/issues/36
                validate: field.id === FORM_FIELD_EMAIL_ID ? field.validate : defaultValidator,
                optional: false,
            };
        });
}

function validateAndNormaliseSignInConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    signUpConfig: TypeNormalisedInputSignUp,
    config?: TypeInputSignIn
): TypeNormalisedInputSignIn {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    let formFields: NormalisedFormField[] = normaliseSignInFormFields(signUpConfig.formFields);

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

export function normaliseSignUpFormFields(formFields?: TypeInputFormField[]): NormalisedFormField[] {
    let normalisedFormFields: NormalisedFormField[] = [];
    if (formFields !== undefined) {
        formFields.forEach((field) => {
            if (field.id === FORM_FIELD_PASSWORD_ID) {
                normalisedFormFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultPasswordValidator : field.validate,
                    optional: false,
                });
            } else if (field.id === FORM_FIELD_EMAIL_ID) {
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
    if (normalisedFormFields.filter((field) => field.id === FORM_FIELD_PASSWORD_ID).length === 0) {
        // no password field give by user
        normalisedFormFields.push({
            id: FORM_FIELD_PASSWORD_ID,
            validate: defaultPasswordValidator,
            optional: false,
        });
    }
    if (normalisedFormFields.filter((field) => field.id === FORM_FIELD_EMAIL_ID).length === 0) {
        // no email field give by user
        normalisedFormFields.push({
            id: FORM_FIELD_EMAIL_ID,
            validate: defaultEmailValidator,
            optional: false,
        });
    }
    return normalisedFormFields;
}

function validateAndNormaliseSignupConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSignUp
): TypeNormalisedInputSignUp {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    let formFields: NormalisedFormField[] = normaliseSignUpFormFields(
        config === undefined ? undefined : config.formFields
    );

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

async function defaultValidator(_: any): Promise<string | undefined> {
    return undefined;
}

async function defaultHandlePostSignUp(_: User, __: { id: string; value: any }[]) {}

async function defaultHandlePostSignIn(_: User) {}

export async function defaultPasswordValidator(value: any) {
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
}

export async function defaultEmailValidator(value: any) {
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
}
