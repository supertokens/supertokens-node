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
import Session from "../recipe";
import type { VerifySessionOptions } from "..";
import type { SessionRequest } from "../../../framework/express/framework";
import { ExpressRequest, ExpressResponse } from "../../../framework/express/framework";
import type { NextFunction, Response } from "express";
import SuperTokens from "../../../supertokens";

export function verifySession(options?: VerifySessionOptions) {
    return async (req: SessionRequest, res: Response, next: NextFunction) => {
        const request = new ExpressRequest(req);
        const response = new ExpressResponse(res);
        try {
            const sessionRecipe = Session.getInstanceOrThrowError();
            req.session = await sessionRecipe.verifySession(options, request, response);
            next();
        } catch (err) {
            try {
                const supertokens = SuperTokens.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response);
            } catch {
                next(err);
            }
        }
    };
}
