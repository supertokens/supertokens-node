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
import Recipe from "../recipe";
import { NormalisedFormField } from "../types";
import STError from "../error";
import { FORM_FIELD_EMAIL_ID } from "../constants";

export async function validateFormFieldsOrThrowError(
    recipeInstance: Recipe,
    configFormFields: NormalisedFormField[],
    formFieldsRaw: any
): Promise<
    {
        id: string;
        value: string;
    }[]
> {
    // first we check syntax ----------------------------
    if (formFieldsRaw === undefined) {
        throw newBadRequestError(recipeInstance, "Missing input param: formFields");
    }

    if (!Array.isArray(formFieldsRaw)) {
        throw newBadRequestError(recipeInstance, "formFields must be an array");
    }

    let formFields: {
        id: string;
        value: string;
    }[] = [];

    for (let i = 0; i < formFieldsRaw.length; i++) {
        let curr = formFieldsRaw[i];
        if (typeof curr !== "object" || curr === null) {
            throw newBadRequestError(recipeInstance, "All elements of formFields must be an object");
        }
        if (typeof curr.id !== "string" || curr.value === undefined) {
            throw newBadRequestError(
                recipeInstance,
                "All elements of formFields must contain an 'id' and 'value' field"
            );
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
    await validateFormOrThrowError(recipeInstance, formFields, configFormFields);

    return formFields;
}

function newBadRequestError(recipeInstance: Recipe, message: string) {
    return new STError(
        {
            type: STError.BAD_INPUT_ERROR,
            message,
        },
        recipeInstance.getRecipeId()
    );
}

// We check that the number of fields in input and config form field is the same.
// We check that each item in the config form field is also present in the input form field
async function validateFormOrThrowError(
    recipeInstance: Recipe,
    inputs: {
        id: string;
        value: string;
    }[],
    configFormFields: NormalisedFormField[]
) {
    let validationErrors: { id: string; error: string }[] = [];

    if (configFormFields.length !== inputs.length) {
        throw newBadRequestError(recipeInstance, "Are you sending too many / too few formFields?");
    }

    // Loop through all form fields.
    for (let i = 0; i < configFormFields.length; i++) {
        const field = configFormFields[i];

        // Find corresponding input value.
        const input = inputs.find((i) => i.id === field.id);

        // Absent or not optional empty field
        if (input === undefined || (input.value === "" && !field.optional)) {
            validationErrors.push({
                error: "Field is not optional",
                id: field.id,
            });
        } else {
            // Otherwise, use validate function.
            const error = await field.validate(input.value);
            // If error, add it.
            if (error !== undefined) {
                validationErrors.push({
                    error,
                    id: field.id,
                });
            }
        }
    }

    if (validationErrors.length !== 0) {
        throw new STError(
            {
                type: STError.FIELD_ERROR,
                payload: validationErrors,
                message: "Error in input formFields",
            },
            recipeInstance.getRecipeId()
        );
    }
}
