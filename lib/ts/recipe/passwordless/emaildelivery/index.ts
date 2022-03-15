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

import { TypePasswordlessEmailDeliveryTypeInput } from "../types";

async function defaultCreateAndSendCustomEmail(
    _: {
        // Where the message should be delivered.
        email: string;
        // This has to be entered on the starting device  to finish sign in/up
        userInputCode?: string;
        // Full url that the end-user can click to finish sign in/up
        urlWithLinkCode?: string;
        codeLifetime: number;
        // Unlikely, but someone could display this (or a derived thing) to identify the device
        preAuthSessionId: string;
    },
    __: any
): Promise<void> {}

export async function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    input: TypePasswordlessEmailDeliveryTypeInput,
    isInServerlessEnv: boolean,
    createAndSendCustomEmail?: (
        input: {
            // Where the message should be delivered.
            email: string;
            // This has to be entered on the starting device  to finish sign in/up
            userInputCode?: string;
            // Full url that the end-user can click to finish sign in/up
            urlWithLinkCode?: string;
            codeLifetime: number;
            // Unlikely, but someone could display this (or a derived thing) to identify the device
            preAuthSessionId: string;
        },
        userContext: any
    ) => Promise<void>
) {
    if (createAndSendCustomEmail === undefined) {
        createAndSendCustomEmail = defaultCreateAndSendCustomEmail;
    }
    try {
        if (!isInServerlessEnv) {
            createAndSendCustomEmail(
                {
                    email: input.email,
                    userInputCode: input.userInputCode,
                    urlWithLinkCode: input.urlWithLinkCode,
                    preAuthSessionId: input.preAuthSessionId,
                    codeLifetime: input.codeLifetime,
                },
                input.userContext
            );
        } else {
            await createAndSendCustomEmail(
                {
                    email: input.email,
                    userInputCode: input.userInputCode,
                    urlWithLinkCode: input.urlWithLinkCode,
                    preAuthSessionId: input.preAuthSessionId,
                    codeLifetime: input.codeLifetime,
                },
                input.userContext
            );
        }
    } catch (_) {}
}
