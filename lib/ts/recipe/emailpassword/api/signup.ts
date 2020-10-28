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
import { Request, Response, NextFunction } from "express";
import { normaliseEmail } from "../utils";
import { FORM_FIELD_EMAIL_ID, FORM_FIELD_PASSWORD_ID } from "../constants";

export async function signUpAPI(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(recipeInstance, req.body.formFields);

    // step 2
    let email = normaliseEmail(formFields.filter((f) => f.id === FORM_FIELD_EMAIL_ID)[0].value);
    let password = formFields.filter((f) => f.id === FORM_FIELD_PASSWORD_ID)[0].value;

    // step 3. Errors for this are caught by the error handler
    let user = await recipeInstance.signUp(email, password);

    // set 4
    await recipeInstance.config.signUpFeature.handleCustomFormFields(
        user,
        formFields.filter((field) => field.id !== FORM_FIELD_EMAIL_ID && field.id !== FORM_FIELD_PASSWORD_ID)
    );

    // step 5
    // TODO: Create a new session using the Session recipe and return OK
}

async function validateFormFieldsOrThrowError(
    recipeInstance: Recipe,
    formFieldsRaw: any
): Promise<
    {
        id: string;
        value: string;
    }[]
> {
    // TODO: first syntax validation
    // TODO: check that email and password exist
    // TODO: then run validators through them.
    return [];
}
