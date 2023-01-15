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
import type { SessionEvent } from "../../../framework/h3/framework";
import { H3Request, H3Response } from "../../../framework/h3/framework";
import SuperTokens from "../../../supertokens";
import { eventHandler } from "h3";

export function verifySession(options?: VerifySessionOptions) {
    return eventHandler(async (event: SessionEvent) => {
        const request = new H3Request(event);
        const response = new H3Response(event);
        try {
            const sessionRecipe = Session.getInstanceOrThrowError();
            event.context.session = await sessionRecipe.verifySession(options, request, response);
        } catch (err) {
            const supertokens = SuperTokens.getInstanceOrThrowError();
            await supertokens.errorHandler(err, request, response);
        }
    });
};