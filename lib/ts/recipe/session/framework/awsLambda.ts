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
import type { Handler, Context, Callback } from "aws-lambda";
import { AWSRequest, AWSResponse } from "../../../framework/awsLambda/framework";
import type { SessionEvent, SessionEventV2 } from "../../../framework/awsLambda/framework";
import SuperTokens from "../../../supertokens";
import Session from "../recipe";
import { VerifySessionOptions } from "..";
import { makeDefaultUserContextFromAPI } from "../../../utils";

export function verifySession(handler: Handler, verifySessionOptions?: VerifySessionOptions): Handler {
    return async (event: SessionEvent | SessionEventV2, context: Context, callback: Callback) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new AWSRequest(event);
        let response = new AWSResponse(event);
        const userContext = makeDefaultUserContextFromAPI(request);

        try {
            let sessionRecipe = Session.getInstanceOrThrowError();
            event.session = await sessionRecipe.verifySession(verifySessionOptions, request, response, userContext);
            let handlerResult = await handler(event, context, callback);
            return response.sendResponse(handlerResult);
        } catch (err) {
            await supertokens.errorHandler(err, request, response);
            if (response.responseSet) {
                return response.sendResponse({});
            }
            throw err;
        }
    };
}
