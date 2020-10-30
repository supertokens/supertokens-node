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
import Session from "../../session";
import { send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";

export default async function signInAPI(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/20#issuecomment-710346362

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        recipeInstance,
        recipeInstance.config.signInFeature.formFields,
        req.body.formFields
    );

    // step 2
    let email = normaliseEmail(formFields.filter((f) => f.id === FORM_FIELD_EMAIL_ID)[0].value);
    let password = formFields.filter((f) => f.id === FORM_FIELD_PASSWORD_ID)[0].value;

    // step 3. Errors for this are caught by the error handler
    let user = await recipeInstance.signIn(email, password);

    // step 4.
    await Session.createNewSession(res, user.id);
    return send200Response(res, {
        status: "OK",
        user,
    });
}
