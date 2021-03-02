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

import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
import { FORM_FIELD_PASSWORD_ID } from "../constants";
import { send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import STError from "../error";

export default async function passwordReset(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/22#issuecomment-710512442

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        recipeInstance,
        recipeInstance.config.resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm,
        req.body.formFields
    );

    let newPassword = formFields.filter((f) => f.id === FORM_FIELD_PASSWORD_ID)[0].value;

    let token = req.body.token;
    if (token === undefined) {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the password reset token",
            },
            recipeInstance
        );
    }
    if (typeof token !== "string") {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "The password reset token must be a string",
            },
            recipeInstance
        );
    }

    // step 2
    await recipeInstance.resetPasswordUsingToken(token, newPassword);

    // step 3
    return send200Response(res, {
        status: "OK",
    });
}
