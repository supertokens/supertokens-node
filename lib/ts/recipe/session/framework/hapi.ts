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
import SuperTokens from "../../../supertokens";
import Session from "../recipe";
import { VerifySessionOptions } from "..";
import { ResponseToolkit } from "@hapi/hapi";
import { ExtendedResponseToolkit, HapiRequest, HapiResponse, SessionRequest } from "../../../framework/hapi/framework";

export function verifySession(options?: VerifySessionOptions) {
    return async (req: SessionRequest, h: ResponseToolkit) => {
        let sessionRecipe = Session.getInstanceOrThrowError();
        let request = new HapiRequest(req);
        let response = new HapiResponse(h as ExtendedResponseToolkit);

        try {
            req.session = await sessionRecipe.verifySession(options, request, response);
        } catch (err) {
            try {
                const supertokens = SuperTokens.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response);
                if (response.responseSet) {
                    let resObj = response.sendResponse(true);
                    (((req.app as any).lazyHeaders || []) as {
                        key: string;
                        value: string;
                        allowDuplicateKey: boolean;
                    }[]).forEach(({ key, value, allowDuplicateKey }) => {
                        resObj.header(key, value, { append: allowDuplicateKey });
                    });
                    return resObj.takeover();
                }
            } catch {
                // We catch and ignore since we want to re-throw the original error if handling wasn't successful
                throw err;
            }
        }
        return h.continue;
    };
}
