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
import { FORM_FIELD_EMAIL_ID, FORM_FIELD_PASSWORD_ID } from "../constants";
import Session from "../../session";
import { send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import STError from "../error";

export default async function signInAPI(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction) {
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

    let email = formFields.filter((f) => f.id === FORM_FIELD_EMAIL_ID)[0].value;
    let password = formFields.filter((f) => f.id === FORM_FIELD_PASSWORD_ID)[0].value;

    // step 3. Errors for this are caught by the error handler
    let user = await recipeInstance.signIn(email, password);

    let jwtPayloadPromise = recipeInstance.config.sessionFeature.setJwtPayload(
        user,
        formFields.filter((field) => field.id !== FORM_FIELD_EMAIL_ID && field.id !== FORM_FIELD_PASSWORD_ID),
        "signin"
    );
    let sessionDataPromise = recipeInstance.config.sessionFeature.setSessionData(
        user,
        formFields.filter((field) => field.id !== FORM_FIELD_EMAIL_ID && field.id !== FORM_FIELD_PASSWORD_ID),
        "signin"
    );

    let jwtPayload: { [key: string]: any } | undefined = undefined;
    let sessionData: { [key: string]: any } | undefined = undefined;
    try {
        jwtPayload = await jwtPayloadPromise;
        sessionData = await sessionDataPromise;
    } catch (err) {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: err,
            },
            recipeInstance
        );
    }

    // step 4.
    await Session.createNewSession(res, user.id, jwtPayload, sessionData);
    return send200Response(res, {
        status: "OK",
        user,
    });
}
