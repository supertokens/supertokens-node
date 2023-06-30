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
import { SUPERTOKENS_SMS_SERVICE_URL } from "../../../../../ingredients/smsdelivery/services/supertokens";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import Supertokens from "../../../../../supertokens";
import { postWithFetch } from "../../../../../utils";

export default class SupertokensService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    sendSms = async (input: TypePasswordlessSmsDeliveryInput) => {
        let supertokens = Supertokens.getInstanceOrThrowError();
        let appName = supertokens.appInfo.appName;
        const res = await postWithFetch(
            SUPERTOKENS_SMS_SERVICE_URL,
            {
                "api-version": "0",
                "content-type": "application/json; charset=utf-8",
            },
            {
                apiKey: this.apiKey,
                smsInput: {
                    type: input.type,
                    phoneNumber: input.phoneNumber,
                    userInputCode: input.userInputCode,
                    urlWithLinkCode: input.urlWithLinkCode,
                    codeLifetime: input.codeLifetime,
                    appName,
                },
            },
            {
                successLog: `Passwordless login SMS sent to ${input.phoneNumber}`,
                errorLogHeader: "Error sending SMS",
            }
        );

        if ("error" in res) {
            throw res.error;
        }

        if (res.resp.status >= 400) {
            throw new Error(res.resp.body);
        }
    };
}
