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
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import axios, { AxiosError } from "axios";
import { NormalisedAppinfo } from "../../../../../types";
import { logDebugMessage } from "../../../../../logger";

function defaultCreateAndSendCustomEmail(appInfo: NormalisedAppinfo) {
    return async (
        input: {
            // Where the message should be delivered.
            email: string;
            // This has to be entered on the starting device  to finish sign in/up
            userInputCode?: string;
            // Full url that the end-user can click to finish sign in/up
            urlWithLinkCode?: string;
            codeLifetime: number;
        },
        _: any
    ): Promise<void> => {
        if (process.env.TEST_MODE === "testing") {
            return;
        }
        try {
            await axios({
                method: "POST",
                url: "https://api.supertokens.io/0/st/auth/passwordless/login",
                data: {
                    email: input.email,
                    appName: appInfo.appName,
                    codeLifetime: input.codeLifetime,
                    urlWithLinkCode: input.urlWithLinkCode,
                    userInputCode: input.userInputCode,
                },
                headers: {
                    "api-version": 0,
                },
            });
            logDebugMessage(`Email sent to ${input.email}`);
        } catch (error) {
            logDebugMessage("Error sending passwordless login email");
            if (axios.isAxiosError(error)) {
                const err = error as AxiosError;
                if (err.response) {
                    logDebugMessage(`Error status: ${err.response.status}`);
                    logDebugMessage(`Error response: ${JSON.stringify(err.response.data)}`);
                } else {
                    logDebugMessage(`Error: ${err.message}`);
                }
            } else {
                logDebugMessage(`Error: ${JSON.stringify(error)}`);
            }
            logDebugMessage("Logging the input below:");
            logDebugMessage(
                JSON.stringify(
                    {
                        email: input.email,
                        appName: appInfo.appName,
                        codeLifetime: input.codeLifetime,
                        urlWithLinkCode: input.urlWithLinkCode,
                        userInputCode: input.userInputCode,
                    },
                    null,
                    2
                )
            );
            /**
             * if the error is thrown from API, the response object
             * will be of type `{err: string}`
             */
            if (axios.isAxiosError(error) && error.response !== undefined) {
                if (error.response.data.err !== undefined) {
                    throw Error(error.response.data.err);
                }
            }
            throw error;
        }
    };
}

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput> {
    private createAndSendCustomEmail: (
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
    ) => Promise<void>;

    constructor(
        appInfo: NormalisedAppinfo,
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
        this.createAndSendCustomEmail =
            createAndSendCustomEmail === undefined
                ? defaultCreateAndSendCustomEmail(appInfo)
                : createAndSendCustomEmail;
    }

    sendEmail = async (input: TypePasswordlessEmailDeliveryInput & { userContext: any }) => {
        await this.createAndSendCustomEmail(
            {
                email: input.email,
                userInputCode: input.userInputCode,
                urlWithLinkCode: input.urlWithLinkCode,
                preAuthSessionId: input.preAuthSessionId,
                codeLifetime: input.codeLifetime,
            },
            input.userContext
        );
    };
}
