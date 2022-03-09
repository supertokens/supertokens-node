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
import { EmailService } from "../types";
import { createTransport, Transporter } from "nodemailer";
import OverrideableBuilder from "supertokens-js-override";

export interface SMTPServiceConfig {
    host: string;
    from: {
        name: string;
        email: string;
    };
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        password: string;
    };
}

export interface GetContentResult {
    body: string;
    subject: string;
    from: {
        name: string;
        email: string;
    };
    toEmail: string;
}

export type ServiceInterface<T> = {
    sendRawEmail: (input: GetContentResult, userContext: any) => Promise<void>;
    getContent: (input: T, userContext: any) => Promise<GetContentResult>;
};

export type SMTPInputConfig<T> = {
    smtpSettings: SMTPServiceConfig;
    override: (oI: ServiceInterface<T>) => ServiceInterface<T>;
};

export type TypeGetDefaultEmailServiceImplementation<T> = (
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
) => ServiceInterface<T>;

export function getSMTPProvider<T>(
    config: SMTPInputConfig<T>,
    getDefaultEmailServiceImplementation: TypeGetDefaultEmailServiceImplementation<T>
): EmailService<T> {
    const transporter = createTransport({
        host: config.smtpSettings.host,
        port: config.smtpSettings.port,
        auth: config.smtpSettings.auth,
        secure: config.smtpSettings.secure,
    });
    let override = (originalImplementation: ServiceInterface<T>) => originalImplementation;
    let builder = new OverrideableBuilder(getDefaultEmailServiceImplementation(transporter, config.smtpSettings.from));
    let serviceImpl = builder.override(override).build();
    return {
        sendEmail: async function (input: T, userConext: any) {
            let content = await serviceImpl.getContent(input, userConext);
            await serviceImpl.sendRawEmail(content, userConext);
        },
    };
}
