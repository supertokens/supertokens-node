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
import { FORM_FIELD_PASSWORD_ID } from "../constants";
import { send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import STError from "../error";
import Session from "../../session";
import { SessionRequest } from "../../session/types";
import { isEmailVerified } from "../coreAPICalls";

export default async function emailVerify(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction) {
    if (req.method === "post") {
        // step 1
        let token = req.body.token;
        if (token === undefined) {
            throw new STError(
                {
                    type: STError.BAD_INPUT_ERROR,
                    message: "Please provide the email verification token",
                },
                recipeInstance.getRecipeId()
            );
        }
        if (typeof token !== "string") {
            throw new STError(
                {
                    type: STError.BAD_INPUT_ERROR,
                    message: "The email verification token must be a string",
                },
                recipeInstance.getRecipeId()
            );
        }

        await recipeInstance.verifyEmailUsingToken(token);

        // step 2
        return send200Response(res, {
            status: "OK",
        });
    } else {
        // Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106

        // step 1.
        await Session.verifySession()(req as SessionRequest, res, next);
        let session = (req as SessionRequest).session;
        let userId = session.getUserId();

        // step 2.
        let exists = await recipeInstance.isEmailVerified(userId);

        // step 3
        return send200Response(res, {
            status: "OK",
            exists,
        });
    }
}
