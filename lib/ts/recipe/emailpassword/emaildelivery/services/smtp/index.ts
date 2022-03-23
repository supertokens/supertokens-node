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
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { createTransport } from "nodemailer";
import OverrideableBuilder from "supertokens-js-override";
import { getServiceImplementation } from "./serviceImplementation";
import EmailVerificationSMTPService from "../../../../emailverification/emaildelivery/services/smtp";
import { getDerivedEV } from "./derivedEmailVerificationServiceImplementation";

export default class SMTPService implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeEmailPasswordEmailDeliveryInput>;
    private config: TypeInput<TypeEmailPasswordEmailDeliveryInput>;
    private evSMTPService: EmailVerificationSMTPService;

    constructor(config: TypeInput<TypeEmailPasswordEmailDeliveryInput>) {
        this.config = config;
        const transporter = createTransport({
            host: config.smtpSettings.host,
            port: config.smtpSettings.port,
            auth: config.smtpSettings.auth,
            secure: config.smtpSettings.secure,
        });
        let builder = new OverrideableBuilder(getServiceImplementation(transporter));
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();

        this.evSMTPService = new EmailVerificationSMTPService({
            smtpSettings: this.config.smtpSettings,
            override: (_) => {
                return getDerivedEV(this.serviceImpl);
            },
        });
    }

    sendEmail = async (input: TypeEmailPasswordEmailDeliveryInput & { userContext: any }) => {
        if (input.type === "EMAIL_VERIFICATION") {
            return this.evSMTPService.sendEmail(input);
        }
        let content = await this.serviceImpl.getContent(input);
        await this.serviceImpl.sendRawEmail({
            ...content,
            ...input.userContext,
            from: this.config.smtpSettings.from,
        });
    };
}
