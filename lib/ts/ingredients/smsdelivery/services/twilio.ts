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
import OverrideableBuilder from "supertokens-js-override";
import * as Twilio from "twilio";

/**
 * only one of "from" and "messagingServiceSid" should be passed.
 * if both are passed, we should throw error to the user
 * saying that only one of them should be set. this is because
 * both parameters can't be passed while calling twilio API.
 * if none of "from" and "messagingServiceSid" is passed, error
 * should be thrown.
 */
export type TwilioServiceConfig =
    | {
          accountSid: string;
          authToken: string;
          from: string;
          opts?: Twilio.Twilio.TwilioClientOptions;
      }
    | {
          accountSid: string;
          authToken: string;
          messagingServiceSid: string;
          opts?: Twilio.Twilio.TwilioClientOptions;
      };

export interface GetContentResult {
    body: string;
    toPhoneNumber: string;
}

export type TypeInputSendRawSms = GetContentResult & { userContext: any } & (
        | {
              from: string;
          }
        | {
              messagingServiceSid: string;
          }
    );

export type ServiceInterface<T> = {
    sendRawSms: (input: TypeInputSendRawSms) => Promise<void>;
    getContent: (input: T & { userContext: any }) => Promise<GetContentResult>;
};

export type TypeInput<T> = {
    twilioSettings: TwilioServiceConfig;
    override?: (oI: ServiceInterface<T>, builder: OverrideableBuilder<ServiceInterface<T>>) => ServiceInterface<T>;
};

export function normaliseUserInputConfig<T>(input: TypeInput<T>): TypeInput<T> {
    let from = "from" in input.twilioSettings ? input.twilioSettings.from : undefined;
    let messagingServiceSid =
        "messagingServiceSid" in input.twilioSettings ? input.twilioSettings.messagingServiceSid : undefined;
    if (
        (from === undefined && messagingServiceSid === undefined) ||
        (from !== undefined && messagingServiceSid !== undefined)
    ) {
        throw Error(`Please pass exactly one of "from" and "messagingServiceSid" config for twilioSettings.`);
    }
    return input;
}
