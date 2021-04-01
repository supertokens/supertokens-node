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
import Session, { SessionContainer } from "../../session";
import { send200Response } from "../../../utils";

export default async function signOutAPI(_: Recipe, req: Request, res: Response, __: NextFunction) {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/34#issuecomment-717958537

    // step 1
    let session: SessionContainer;
    try {
        session = await Session.getSession(req, res);
    } catch (err) {
        if (Session.Error.isErrorFromSuperTokens(err) && err.type === Session.Error.UNAUTHORISED) {
            // The session is expired / does not exist anyway. So we return OK
            return send200Response(res, {
                status: "OK",
            });
        }
        throw err;
    }

    // step 2
    await session.revokeSession();

    // step 3
    return send200Response(res, {
        status: "OK",
    });
}
