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
import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import EmailPasswordBackwardCompatibilityService from "../../../../emailpassword/emaildelivery/services/backwardCompatibility";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService: EmailPasswordBackwardCompatibilityService;

    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) {
        {
            this.emailPasswordBackwardCompatibilityService = new EmailPasswordBackwardCompatibilityService(
                appInfo,
                isInServerlessEnv
            );
        }
    }

    sendEmail = async (input: TypeThirdPartyEmailPasswordEmailDeliveryInput & { userContext: Record<string, any> }) => {
        await this.emailPasswordBackwardCompatibilityService.sendEmail(input);
    };
}
