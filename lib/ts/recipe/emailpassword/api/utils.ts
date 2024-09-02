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
import { NormalisedFormField } from "../types";
import STError from "../error";
import { FORM_FIELD_EMAIL_ID, FORM_FIELD_PASSWORD_ID } from "../constants";
import { UserContext } from "../../../types";

export async function validateFormFieldsOrThrowError(
    configFormFields: NormalisedFormField[],
    formFieldsRaw: any,
    tenantId: string,
    userContext: UserContext
): Promise<
    {
        id: string;
        value: string;
    }[]
> {
    // first we check syntax ----------------------------
    if (formFieldsRaw === undefined) {
        throw newBadRequestError("Missing input param: formFields");
    }

    if (!Array.isArray(formFieldsRaw)) {
        throw newBadRequestError("formFields must be an array");
    }

    let formFields: {
        id: string;
        value: string;
    }[] = [];

    for (let i = 0; i < formFieldsRaw.length; i++) {
        let curr = formFieldsRaw[i];
        if (typeof curr !== "object" || curr === null) {
            throw newBadRequestError("All elements of formFields must be an object");
        }
        if (typeof curr.id !== "string" || curr.value === undefined) {
            throw newBadRequestError("All elements of formFields must contain an 'id' and 'value' field");
        }
        if (curr.id === FORM_FIELD_EMAIL_ID || curr.id === FORM_FIELD_PASSWORD_ID) {
            if (typeof curr.value !== "string") {
                throw newBadRequestError("The value of formFields with id = " + curr.id + " must be a string");
            }
        }
        formFields.push(curr);
    }

    // we trim the email: https://github.com/supertokens/supertokens-core/issues/99
    formFields = formFields.map((field) => {
        if (field.id === FORM_FIELD_EMAIL_ID) {
            return {
                ...field,
                value: field.value.trim(),
            };
        }
        return field;
    });

    // then run validators through them-----------------------
    await validateFormOrThrowError(formFields, configFormFields, tenantId, userContext);

    return formFields;
}

function newBadRequestError(message: string) {
    return new STError({
        type: STError.BAD_INPUT_ERROR,
        message,
    });
}

// We check to make sure we are validating each required form field
// and also validate optional form fields only when present
async function validateFormOrThrowError(
    inputs: {
        id: string;
        value: string;
    }[],
    configFormFields: NormalisedFormField[],
    tenantId: string,
    userContext: UserContext
) {
    let validationErrors: { id: string; error: string }[] = [];
    let requiredFormFields = new Set();

    configFormFields.forEach((formField) => {
        if (!formField.optional) {
            requiredFormFields.add(formField.id);
        }
    });

    if (inputs.length < requiredFormFields.size || inputs.length > configFormFields.length) {
        throw newBadRequestError("Are you sending too many / too few formFields?");
    }

    for (const formField of configFormFields) {
        const input = inputs.find((input) => input.id === formField.id);

        // Add the not optional error if input is not passed
        // and the field is not optional.
        const isValidInput =
            !!input &&
            ((typeof input.value === "string" && input.value.length > 0) ||
                (typeof input.value === "object" && Object.values(input.value).length > 0));
        if (!formField.optional && !isValidInput) {
            validationErrors.push({
                error: "Field is not optional",
                id: formField.id,
            });
        }

        if (isValidInput) {
            const error = await formField.validate(input!.value, tenantId, userContext);
            if (error) {
                validationErrors.push({
                    error,
                    id: formField.id,
                });
            }
        }
    }

    if (validationErrors.length > 0) {
        throw new STError({
            type: STError.FIELD_ERROR,
            payload: validationErrors,
            message: "Error in input formFields",
        });
    }
}
