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
    ServiceInterface,
    TypeInput,
    normaliseUserInputConfig,
} from "../../../../../ingredients/smsdelivery/services/twilio";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import Twilio from "twilio";
import OverrideableBuilder from "supertokens-js-override";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { getServiceImplementation } from "./serviceImplementation";

export default class TwilioService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    serviceImpl: ServiceInterface<TypePasswordlessSmsDeliveryInput>;
    private config: TypeInput<TypePasswordlessSmsDeliveryInput>;

    constructor(config: TypeInput<TypePasswordlessSmsDeliveryInput>) {
        this.config = normaliseUserInputConfig(config);
        const twilioClient = Twilio(
            config.twilioSettings.accountSid,
            config.twilioSettings.authToken,
            config.twilioSettings.opts
        );
        let builder = new OverrideableBuilder(getServiceImplementation(twilioClient));
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
    }

    sendSms = async (input: TypePasswordlessSmsDeliveryInput & { userContext: Record<string, any> }) => {
        let content = await this.serviceImpl.getContent(input);
        if ("from" in this.config.twilioSettings) {
            await this.serviceImpl.sendRawSms({
                ...content,
                userContext: input.userContext,
                from: this.config.twilioSettings.from,
            });
        } else {
            await this.serviceImpl.sendRawSms({
                ...content,
                userContext: input.userContext,
                messagingServiceSid: this.config.twilioSettings.messagingServiceSid,
            });
        }
    };
}
