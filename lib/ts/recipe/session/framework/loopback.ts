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
import { InterceptorOrKey, InvocationContext, Next } from "@loopback/core";
import { MiddlewareContext } from "@loopback/rest";
import type { SessionContext as Context } from "../../../framework/loopback/framework";
import { LoopbackRequest, LoopbackResponse } from "../../../framework/loopback/framework";
import { makeDefaultUserContextFromAPI } from "../../../utils";

export function verifySession(options?: VerifySessionOptions): InterceptorOrKey {
    return async (ctx: InvocationContext, next: Next) => {
        let sessionRecipe = Session.getInstanceOrThrowError();
        let middlewareCtx = await ctx.get<MiddlewareContext>("middleware.http.context");
        let request = new LoopbackRequest(middlewareCtx);
        let response = new LoopbackResponse(middlewareCtx);
        const userContext = makeDefaultUserContextFromAPI(request);

        try {
            (middlewareCtx as Context).session = await sessionRecipe.verifySession(
                options,
                request,
                response,
                userContext
            );
        } catch (err) {
            try {
                const supertokens = SuperTokens.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response, userContext);
                return;
            } catch {
                // We catch and ignore since we want to re-throw the original error if handling wasn't successful
                throw err;
            }
        }
        return await next();
    };
}
