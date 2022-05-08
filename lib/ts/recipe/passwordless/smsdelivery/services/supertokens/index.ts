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
import {
    SupertokensServiceConfig,
    SUPERTOKENS_SMS_SERVICE_URL,
} from "../../../../../ingredients/smsdelivery/services/supertokens";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import axios from "axios";

export default class SupertokensService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private config: SupertokensServiceConfig;

    constructor(config: SupertokensServiceConfig) {
        this.config = config;
    }

    sendSms = async (input: TypePasswordlessSmsDeliveryInput) => {
        await axios({
            method: "post",
            url: SUPERTOKENS_SMS_SERVICE_URL,
            data: {
                apiKey: this.config.apiKey,
                type: input.type,
                phoneNumber: input.phoneNumber,
                userInputCode: input.userInputCode,
                urlWithLinkCode: input.urlWithLinkCode,
                codeLifetime: input.codeLifetime,
            },
            headers: {
                "api-version": "0",
            },
        });
    };
}
