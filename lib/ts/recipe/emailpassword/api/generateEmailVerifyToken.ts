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
import { send200Response, sendNon200Response } from "../../../utils";
import STError from "../error";
import Session from "../../session";
import { SessionRequest } from "../../session/types";

export default async function generateEmailVerifyToken(
    recipeInstance: Recipe,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106

    // step 1.
    await Session.verifySession()(req as SessionRequest, res, next);
    let session = (req as SessionRequest).session;
    let userId = session.getUserId();
    let user = await recipeInstance.getUserById(userId);
    if (user === undefined) {
        throw new STError(
            {
                type: STError.UNKNOWN_USER_ID_ERROR,
                message: "Failed to generated email verification token as the user ID is unknown",
            },
            recipeInstance.getRecipeId()
        );
    }

    // step 2
    let token: string;
    try {
        token = await recipeInstance.createEmailVerificationToken(user.id);
    } catch (err) {
        if (STError.isErrorFromSuperTokens(err) && err.type === STError.EMAIL_ALREADY_VERIFIED_ERROR) {
            return send200Response(res, {
                status: "OK",
            });
        } else if (STError.isErrorFromSuperTokens(err) && err.type === STError.UNKNOWN_USER_ID_ERROR) {
            throw new STError(
                {
                    type: STError.UNKNOWN_USER_ID_ERROR,
                    message: "Failed to generated email verification token as the user ID is unknown",
                },
                recipeInstance.getRecipeId()
            );
        }
        throw err;
    }

    // step 3
    let emailVerifyLink =
        (await recipeInstance.config.emailVerificationFeature.getEmailVerificationURL(user)) +
        "?token=" +
        token +
        "&rid=" +
        recipeInstance.getRecipeId();

    // step 4
    send200Response(res, {
        status: "OK",
    });

    // step 5 & 6
    try {
        await recipeInstance.config.emailVerificationFeature.createAndSendCustomEmail(user, emailVerifyLink);
    } catch (ignored) {}
}
