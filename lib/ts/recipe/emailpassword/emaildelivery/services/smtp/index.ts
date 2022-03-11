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
    GetContentResult,
    SMTPInputConfig,
    getSMTPProvider,
} from "../../../../emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import getPasswordResetEmailContent from "./passwordReset";
import getEmailVerifyEmailContent from "../../../../emailverification/emaildelivery/services/smtp/emailVerify";

export default function getEmailPasswordEmailServiceSMTP(config: SMTPInputConfig<TypeEmailPasswordEmailDeliveryInput>) {
    return getSMTPProvider(config, getDefaultEmailServiceImplementation);
}

export function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeEmailPasswordEmailDeliveryInput> {
    return {
        sendRawEmail: async function (input: GetContentResult, _: any) {
            await transporter.sendMail({
                from: `${input.from.name} <${input.from.email}>`,
                to: input.toEmail,
                subject: input.subject,
                html: input.body,
            });
        },
        getContent: async function (input: TypeEmailPasswordEmailDeliveryInput, _: any): Promise<GetContentResult> {
            if (input.type === "EMAIL_VERIFICATION") {
                return getEmailVerifyEmailContent(input, from);
            }
            return getPasswordResetEmailContent(input, from);
        },
    };
}
