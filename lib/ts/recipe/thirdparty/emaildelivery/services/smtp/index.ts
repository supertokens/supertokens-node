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
import { TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { TypeThirdPartyEmailDeliveryInput } from "../../../types";
import EmailVerificationSMTPService from "../../../../emailverification/emaildelivery/services/smtp";

export default class SMTPService implements EmailDeliveryInterface<TypeThirdPartyEmailDeliveryInput> {
    private emailVerificationSMTPService: EmailVerificationSMTPService;

    constructor(config: TypeInput<TypeThirdPartyEmailDeliveryInput>) {
        this.emailVerificationSMTPService = new EmailVerificationSMTPService(config);
    }

    sendEmail = async (input: TypeThirdPartyEmailDeliveryInput & { userContext: any }) => {
        await this.emailVerificationSMTPService.sendEmail(input);
    };
}
