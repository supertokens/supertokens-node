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
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { NormalisedAppinfo } from "../../../../../types";

function defaultCreateAndSendCustomSms(_: NormalisedAppinfo) {
    return async (
        __: {
            // Where the message should be delivered.
            phoneNumber: string;
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
        // TODO: Skip in this PR
    };
}

export default class BackwardCompatibilityService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private createAndSendCustomSms: (
        input: {
            // Where the message should be delivered.
            phoneNumber: string;
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
        createAndSendCustomSms?: (
            input: {
                // Where the message should be delivered.
                phoneNumber: string;
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
        this.createAndSendCustomSms =
            createAndSendCustomSms === undefined ? defaultCreateAndSendCustomSms(appInfo) : createAndSendCustomSms;
    }

    sendSms = async (input: TypePasswordlessSmsDeliveryInput & { userContext: any }) => {
        await this.createAndSendCustomSms(
            {
                phoneNumber: input.phoneNumber,
                userInputCode: input.userInputCode,
                urlWithLinkCode: input.urlWithLinkCode,
                preAuthSessionId: input.preAuthSessionId,
                codeLifetime: input.codeLifetime,
            },
            input.userContext
        );
    };
}
