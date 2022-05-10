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

import { TypeEmailPasswordEmailDeliveryInput } from "../../../../types";
import { Transporter } from "nodemailer";
import {
    ServiceInterface,
    TypeInputSendRawEmail,
    GetContentResult,
} from "../../../../../../ingredients/emaildelivery/services/smtp";
import getPasswordResetEmailContent from "../passwordReset";
import { getServiceImplementation as getEmailVerificationServiceImplementation } from "../../../../../emailverification/emaildelivery/services/smtp/serviceImplementation";
import DerivedEV from "./emailVerificationServiceImplementation";

export function getServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeEmailPasswordEmailDeliveryInput> {
    let emailVerificationSeriveImpl = getEmailVerificationServiceImplementation(transporter, from);
    return {
        sendRawEmail: async function (input: TypeInputSendRawEmail) {
            await transporter.sendMail({
                from: `${from.name} <${from.email}>`,
                to: input.toEmail,
                subject: input.subject,
                html: input.body,
            });
        },
        getContent: async function (
            input: TypeEmailPasswordEmailDeliveryInput & { userContext: any }
        ): Promise<GetContentResult> {
            if (input.type === "EMAIL_VERIFICATION") {
                return await emailVerificationSeriveImpl.getContent.bind(DerivedEV(this))(input);
            }
            return getPasswordResetEmailContent(input);
        },
    };
}
