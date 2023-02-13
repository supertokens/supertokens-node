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
import Twilio from "twilio/lib/rest/Twilio";
import {
    ServiceInterface,
    TypeInputSendRawSms,
    GetContentResult,
} from "../../../../../ingredients/smsdelivery/services/twilio";
import getPasswordlessLoginSmsContent from "./passwordlessLogin";

export function getServiceImplementation(twilioClient: Twilio): ServiceInterface<TypePasswordlessSmsDeliveryInput> {
    return {
        sendRawSms: async function (input: TypeInputSendRawSms) {
            if ("from" in input) {
                await twilioClient.messages.create({
                    to: input.toPhoneNumber,
                    body: input.body,
                    from: input.from,
                });
            } else {
                await twilioClient.messages.create({
                    to: input.toPhoneNumber,
                    body: input.body,
                    messagingServiceSid: input.messagingServiceSid,
                });
            }
        },
        getContent: async function (
            input: TypePasswordlessSmsDeliveryInput & { userContext: any }
        ): Promise<GetContentResult> {
            return getPasswordlessLoginSmsContent(input);
        },
    };
}
