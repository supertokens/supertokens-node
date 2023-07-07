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
    TypeInputSignUp,
    TypeNormalisedInputSignUp,
    TypeNormalisedInputSignIn,
    TypeNormalisedInputResetPasswordUsingTokenFeature,
    NormalisedFormField,
    TypeInputFormField,
} from "./types";
import { NormalisedAppinfo } from "../../types";
import { FORM_FIELD_EMAIL_ID, FORM_FIELD_PASSWORD_ID } from "./constants";
import { RecipeInterface, APIInterface } from "./types";
import BackwardCompatibilityService from "./emaildelivery/services/backwardCompatibility";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    let signUpFeature = validateAndNormaliseSignupConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );

    let signInFeature = validateAndNormaliseSignInConfig(recipeInstance, appInfo, signUpFeature);

    let resetPasswordUsingTokenFeature = validateAndNormaliseResetPasswordUsingTokenConfig(signUpFeature);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    function getEmailDeliveryConfig(recipeImpl: RecipeInterface, isInServerlessEnv: boolean) {
        let emailService = config?.emailDelivery?.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we use the default
         * createAndSendEmailUsingSupertokensService implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityService(recipeImpl, appInfo, isInServerlessEnv);
        }
        return {
            ...config?.emailDelivery,
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
        };
    }
    return {
        signUpFeature,
        signInFeature,
        resetPasswordUsingTokenFeature,
        override,
        getEmailDeliveryConfig,
    };
}

function validateAndNormaliseResetPasswordUsingTokenConfig(
    signUpConfig: TypeNormalisedInputSignUp
): TypeNormalisedInputResetPasswordUsingTokenFeature {
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

    return {
        formFieldsForPasswordResetForm,
        formFieldsForGenerateTokenForm,
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
    signUpConfig: TypeNormalisedInputSignUp
): TypeNormalisedInputSignIn {
    let formFields: NormalisedFormField[] = normaliseSignInFormFields(signUpConfig.formFields);

    return {
        formFields,
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
    let formFields: NormalisedFormField[] = normaliseSignUpFormFields(
        config === undefined ? undefined : config.formFields
    );

    return {
        formFields,
    };
}

async function defaultValidator(_: any): Promise<string | undefined> {
    return undefined;
}

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

export function getPasswordResetLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    recipeId: string;
    tenantId: string;
}): string {
    return (
        input.appInfo.websiteDomain.getAsStringDangerous() +
        input.appInfo.websiteBasePath.getAsStringDangerous() +
        "/reset-password?token=" +
        input.token +
        "&rid=" +
        input.recipeId +
        "&tenantId=" +
        input.tenantId
    );
}
