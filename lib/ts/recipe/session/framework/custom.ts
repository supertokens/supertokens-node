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
import SuperTokens from "../../../supertokens";
import { makeDefaultUserContextFromAPI } from "../../../utils";
import { BaseRequest, BaseResponse } from "../../../framework";
import { NextFunction } from "../../../framework/custom/framework";
import { SessionContainerInterface } from "../types";

export function verifySession<T extends BaseRequest & { session?: SessionContainerInterface }>(
    options?: VerifySessionOptions
) {
    return async (req: T, res: BaseResponse, next?: NextFunction) => {
        const userContext = makeDefaultUserContextFromAPI(req);

        try {
            const sessionRecipe = Session.getInstanceOrThrowError();
            req.session = await sessionRecipe.verifySession(options, req, res, userContext);
            if (next !== undefined) {
                next();
            }
            return undefined;
        } catch (err) {
            try {
                const supertokens = SuperTokens.getInstanceOrThrowError();
                await supertokens.errorHandler(err, req, res);
                return undefined;
            } catch {
                if (next !== undefined) {
                    next(err);
                }
                return err;
            }
        }
    };
}
