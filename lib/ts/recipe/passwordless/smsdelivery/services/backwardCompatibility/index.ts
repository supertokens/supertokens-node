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
import { SUPERTOKENS_SMS_SERVICE_URL } from "../../../../../ingredients/smsdelivery/services/supertokens";
import Supertokens from "../../../../../supertokens";
import { postWithFetch } from "../../../../../utils";
import { UserContext } from "../../../../../types";

async function createAndSendSmsUsingSupertokensService(input: {
    // Where the message should be delivered.
    phoneNumber: string;
    // This has to be entered on the starting device  to finish sign in/up
    userInputCode?: string;
    // Full url that the end-user can click to finish sign in/up
    urlWithLinkCode?: string;
    codeLifetime: number;
    isFirstFactor: boolean;
}): Promise<void> {
    let supertokens = Supertokens.getInstanceOrThrowError();
    let appName = supertokens.appInfo.appName;
    const result = await postWithFetch(
        SUPERTOKENS_SMS_SERVICE_URL,
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            smsInput: {
                appName,
                type: "PASSWORDLESS_LOGIN",
                phoneNumber: input.phoneNumber,
                userInputCode: input.userInputCode,
                urlWithLinkCode: input.urlWithLinkCode,
                codeLifetime: input.codeLifetime,
                isFirstFactor: input.isFirstFactor,
            },
        },
        {
            successLog: `Passwordless login SMS sent to ${input.phoneNumber}`,
            errorLogHeader: "Error sending passwordless login SMS",
        }
    );

    if ("error" in result) {
        throw result.error;
    }
    if (result.resp.status >= 400) {
        if (result.resp.status !== 429) {
            if (result.resp.body.err) {
                /**
                 * if the error is thrown from API, the response object
                 * will be of type `{err: string}`
                 */
                throw new Error(result.resp.body.err);
            } else {
                throw new Error(`Request failed with status code ${result.resp.status}`);
            }
        } else {
            /**
             * if we do console.log(`SMS content: ${input}`);
             * Output would be:
             * SMS content: [object Object]
             */
            /**
             * JSON.stringify takes 3 inputs
             *  - value: usually an object or array, to be converted
             *  - replacer:  An array of strings and numbers that acts
             *               as an approved list for selecting the object
             *               properties that will be stringified
             *  - space: Adds indentation, white space, and line break characters
             *           to the return-value JSON text to make it easier to read
             *
             * console.log(JSON.stringify({"a": 1, "b": 2}))
             * Output:
             * {"a":1,"b":2}
             *
             * console.log(JSON.stringify({"a": 1, "b": 2}, null, 2))
             * Output:
             * {
             *   "a": 1,
             *   "b": 2
             * }
             */
            console.log(
                "Free daily SMS quota reached. If you want to use SuperTokens to send SMS, please sign up on supertokens.com to get your SMS API key, else you can also define your own method by overriding the service. For now, we are logging it below:"
            );
            console.log(`\nSMS content: ${JSON.stringify(input, null, 2)}`);
        }
    }
}

export default class BackwardCompatibilityService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    constructor() {}

    sendSms = async (input: TypePasswordlessSmsDeliveryInput & { userContext: UserContext }) => {
        await createAndSendSmsUsingSupertokensService({
            phoneNumber: input.phoneNumber,
            userInputCode: input.userInputCode,
            urlWithLinkCode: input.urlWithLinkCode,
            codeLifetime: input.codeLifetime,
            isFirstFactor: input.isFirstFactor,
        });
    };
}
