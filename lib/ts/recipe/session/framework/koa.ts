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
import type { Next } from "koa";
import { KoaRequest, KoaResponse } from "../../../framework/koa/framework";
import type { SessionContext } from "../../../framework/koa/framework";

export function verifySession(options?: VerifySessionOptions) {
    return async (ctx: SessionContext, next: Next) => {
        let sessionRecipe = Session.getInstanceOrThrowError();
        let request = new KoaRequest(ctx);
        let response = new KoaResponse(ctx);
        ctx.session = await sessionRecipe.verifySession(options, request, response);
        await next();
    };
}
