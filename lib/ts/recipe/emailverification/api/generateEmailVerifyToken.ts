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
import { send200Response } from "../../../utils";
import Session from "../../session";
import { SessionRequest } from "../../session/types";

export default async function generateEmailVerifyToken(
    recipeInstance: Recipe,
    req: Request,
    res: Response,
    _: NextFunction
) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106

    // step 1.
    await new Promise((resolve, reject) =>
        Session.verifySession()(req as SessionRequest, res, (err: any) => {
            if (err !== undefined) {
                reject(err);
            } else {
                resolve(undefined);
            }
        })
    );
    let session = (req as SessionRequest).session;
    let userId = session.getUserId();

    let email = await recipeInstance.config.getEmailForUserId(userId);

    // step 2
    let token = await recipeInstance.createEmailVerificationToken(userId, email);

    // step 3
    let emailVerifyLink =
        (await recipeInstance.config.getEmailVerificationURL({ id: userId, email })) +
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
        await recipeInstance.config.createAndSendCustomEmail({ id: userId, email }, emailVerifyLink);
    } catch (ignored) {}
}
