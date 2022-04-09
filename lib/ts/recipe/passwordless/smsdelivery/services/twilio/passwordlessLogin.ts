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
import { GetContentResult } from "../../../../../ingredients/smsdelivery/services/twilio";

export default function getPasswordlessLoginSmsContent(input: TypePasswordlessSmsDeliveryInput): GetContentResult {
    let body = getPasswordlessLoginSmsBody(input.codeLifetime, input.urlWithLinkCode, input.userInputCode);
    return {
        body,
        toPhoneNumber: input.phoneNumber,
    };
}

function getPasswordlessLoginSmsBody(
    codeLifetime: number,
    urlWithLinkCode: string | undefined,
    userInputCode: string | undefined
) {
    let message = "";
    if (urlWithLinkCode !== undefined && userInputCode !== undefined) {
        message = `Enter OTP: ${userInputCode} OR click this link: ${urlWithLinkCode} to login.`;
    } else if (urlWithLinkCode !== undefined) {
        message = `Click this link: ${urlWithLinkCode} to login.`;
    } else {
        message = `Enter OTP: ${userInputCode} to login.`;
    }
    message += ` It will expire in ${codeLifetime} seconds.`;
    return message;
}
