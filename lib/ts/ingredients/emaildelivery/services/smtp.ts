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
import { EmailDeliveryInterface } from "../types";
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
    toEmail: string;
}

export type TypeInputSendRawEmail = GetContentResult & { userContext: any } & {
    from: {
        name: string;
        email: string;
    };
};

export type ServiceInterface<T> = {
    sendRawEmail: (input: TypeInputSendRawEmail) => Promise<void>;
    getContent: (input: T & { userContext: any }) => Promise<GetContentResult>;
};

export type TypeInput<T> = {
    smtpSettings: SMTPServiceConfig;
    override?: (oI: ServiceInterface<T>) => ServiceInterface<T>;
};

export type TypeGetDefaultEmailServiceImplementation<T> = (
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
) => ServiceInterface<T>;

export function getEmailServiceImplementation<T>(
    config: TypeInput<T>,
    getDefaultEmailServiceImplementation: TypeGetDefaultEmailServiceImplementation<T>
): EmailDeliveryInterface<T> {
    const transporter = createTransport({
        host: config.smtpSettings.host,
        port: config.smtpSettings.port,
        auth: config.smtpSettings.auth,
        secure: config.smtpSettings.secure,
    });
    let builder = new OverrideableBuilder(getDefaultEmailServiceImplementation(transporter, config.smtpSettings.from));
    if (config.override !== undefined) {
        builder = builder.override(config.override);
    }
    let serviceImpl = builder.build();
    return {
        sendEmail: async function (input: T & { userContext: any }) {
            let content = await serviceImpl.getContent(input);
            await serviceImpl.sendRawEmail({
                ...content,
                ...input.userContext,
                from: config.smtpSettings.from,
            });
        },
    };
}
