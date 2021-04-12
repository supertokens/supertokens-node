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

import Recipe from "../sessionRecipe";
import { Request, Response, NextFunction } from "express";
import { send200Response } from "../../../utils";
import STError from "../error";

export default async function signOutAPI(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/34#issuecomment-717958537

    // step 1
    let session;
    try {
        session = await recipeInstance.getSession(req, res);
    } catch (err) {
        if (STError.isErrorFromSuperTokens(err) && err.type === STError.UNAUTHORISED) {
            // The session is expired / does not exist anyway. So we return OK
            return send200Response(res, {
                status: "OK",
            });
        }
        throw err;
    }

    if (session === undefined) {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            },
            recipeInstance
        );
    }

    // step 2
    await session.revokeSession();

    // step 3
    return send200Response(res, {
        status: "OK",
    });
}
