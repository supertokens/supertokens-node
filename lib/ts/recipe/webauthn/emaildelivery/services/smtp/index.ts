/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeWebauthnEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { createTransport } from "nodemailer";
import OverrideableBuilder from "supertokens-js-override";
import { getServiceImplementation } from "./serviceImplementation";
import { UserContext } from "../../../../../types";

export default class SMTPService implements EmailDeliveryInterface<TypeWebauthnEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeWebauthnEmailDeliveryInput>;

    constructor(config: TypeInput<TypeWebauthnEmailDeliveryInput>) {
        const transporter = createTransport({
            host: config.smtpSettings.host,
            port: config.smtpSettings.port,
            auth: {
                user: config.smtpSettings.authUsername || config.smtpSettings.from.email,
                pass: config.smtpSettings.password,
            },
            secure: config.smtpSettings.secure,
        });
        let builder = new OverrideableBuilder(getServiceImplementation(transporter, config.smtpSettings.from));
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
    }

    sendEmail = async (input: TypeWebauthnEmailDeliveryInput & { userContext: UserContext }) => {
        let content = await this.serviceImpl.getContent(input);
        await this.serviceImpl.sendRawEmail({
            ...content,
            userContext: input.userContext,
        });
    };
}
