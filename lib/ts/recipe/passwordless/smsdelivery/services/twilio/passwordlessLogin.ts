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
import { humaniseMilliseconds } from "../../../../../utils";
import Supertokens from "../../../../../supertokens";

export default function getPasswordlessLoginSmsContent(input: TypePasswordlessSmsDeliveryInput): GetContentResult {
    let supertokens = Supertokens.getInstanceOrThrowError();
    let appName = supertokens.appInfo!.appName;
    let body = getPasswordlessLoginSmsBody(appName, input.codeLifetime, input.urlWithLinkCode, input.userInputCode);
    return {
        body,
        toPhoneNumber: input.phoneNumber,
    };
}

function getPasswordlessLoginSmsBody(
    appName: string,
    codeLifetime: number,
    urlWithLinkCode: string | undefined,
    userInputCode: string | undefined
) {
    let message = "";
    if (urlWithLinkCode !== undefined && userInputCode !== undefined) {
        message += `OTP to login is ${userInputCode} for ${appName}\n\nOR click ${urlWithLinkCode} to login.\n\n`;
    } else if (urlWithLinkCode !== undefined) {
        message += `Click ${urlWithLinkCode} to login to ${appName}\n\n`;
    } else {
        message += `OTP to login is ${userInputCode} for ${appName}\n\n`;
    }
    const humanisedCodeLifetime = humaniseMilliseconds(codeLifetime);
    message += `This is valid for ${humanisedCodeLifetime}.`;
    return message;
}
