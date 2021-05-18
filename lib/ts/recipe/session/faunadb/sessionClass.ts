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

import OriginalSessionClass from "../sessionClass";
import { FAUNADB_SESSION_KEY } from "./constants";
import * as express from "express";
import OriginalSessionRecipe from "../recipe";

export default class Session extends OriginalSessionClass {
    constructor(
        recipeInstance: OriginalSessionRecipe,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        res: express.Response
    ) {
        super(recipeInstance, accessToken, sessionHandle, userId, userDataInJWT, res);
    }

    getFaunadbToken = async (): Promise<string> => {
        let jwtPayload = this.getJWTPayload();
        if (jwtPayload[FAUNADB_SESSION_KEY] !== undefined) {
            // this operation costs nothing. So we can check
            return jwtPayload[FAUNADB_SESSION_KEY];
        } else {
            let sessionData = await this.getSessionData();
            return sessionData[FAUNADB_SESSION_KEY];
        }
    };
}
