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

import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../../types";
import { Transporter } from "nodemailer";
import {
    ServiceInterface,
    TypeInputSendRawEmail,
    GetContentResult,
} from "../../../../../../ingredients/emaildelivery/services/smtp";
import { getServiceImplementation as getEmailVerificationServiceImplementation } from "../../../../../emailverification/emaildelivery/services/smtp/serviceImplementation";
import { getServiceImplementation as getPasswordlessServiceImplementation } from "../../../../../passwordless/emaildelivery/services/smtp/serviceImplementation";
import DerivedEV from "./emailVerificationServiceImplementation";
import DerivedPwdless from "./passwordlessServiceImplementation";

export function getServiceImplementation(
    transporter: Transporter
): ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    let emailVerificationSeriveImpl = getEmailVerificationServiceImplementation(transporter);
    let passwordlessSeriveImpl = getPasswordlessServiceImplementation(transporter);
    return {
        sendRawEmail: async function (input: TypeInputSendRawEmail) {
            await transporter.sendMail({
                from: `${input.from.name} <${input.from.email}>`,
                to: input.toEmail,
                subject: input.subject,
                html: input.body,
            });
        },
        getContent: async function (
            input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext: any }
        ): Promise<GetContentResult> {
            if (input.type === "EMAIL_VERIFICATION") {
                return await emailVerificationSeriveImpl.getContent.bind(DerivedEV(this))(input);
            }
            return await passwordlessSeriveImpl.getContent.bind(DerivedPwdless(this))(input);
        },
    };
}
