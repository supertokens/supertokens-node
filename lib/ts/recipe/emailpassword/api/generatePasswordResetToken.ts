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
import { FORM_FIELD_EMAIL_ID } from "../constants";
import { send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import STError from "../error";

export default async function generatePasswordResetToken(
    recipeInstance: Recipe,
    req: Request,
    res: Response,
    _: NextFunction
) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/22#issuecomment-710512442

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        recipeInstance,
        recipeInstance.config.resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm,
        req.body.formFields
    );

    let email = formFields.filter((f) => f.id === FORM_FIELD_EMAIL_ID)[0].value;

    // step 2.
    let user = await recipeInstance.recipeInterfaceImpl.getUserByEmail(email);
    if (user === undefined) {
        return send200Response(res, {
            status: "OK",
        });
    }

    // step 3
    let token: string;
    try {
        token = await recipeInstance.recipeInterfaceImpl.createResetPasswordToken(user.id);
    } catch (err) {
        if (STError.isErrorFromSuperTokens(err) && err.type === STError.UNKNOWN_USER_ID_ERROR) {
            return send200Response(res, {
                status: "OK",
            });
        }
        throw err;
    }

    // step 4
    let passwordResetLink =
        (await recipeInstance.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user)) +
        "?token=" +
        token +
        "&rid=" +
        recipeInstance.getRecipeId();

    // step 5
    send200Response(res, {
        status: "OK",
    });

    // step 6 & 7
    try {
        await recipeInstance.config.resetPasswordUsingTokenFeature.createAndSendCustomEmail(user, passwordResetLink);
    } catch (ignored) {}
}
