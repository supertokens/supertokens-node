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
import { TypeEmailVerificationEmailDeliveryInput } from "../../../types";
import { createAndSendEmailUsingSupertokensService } from "../../../emailVerificationFunctions";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput> {
    private appInfo: NormalisedAppinfo;
    private isInServerlessEnv: boolean;

    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) {
        this.appInfo = appInfo;
        this.isInServerlessEnv = isInServerlessEnv;
    }

    sendEmail = async (input: TypeEmailVerificationEmailDeliveryInput & { userContext: UserContext }) => {
        try {
            if (!this.isInServerlessEnv) {
                createAndSendEmailUsingSupertokensService(
                    this.appInfo,
                    input.user,
                    input.emailVerifyLink
                ).catch((_) => {});
            } else {
                // see https://github.com/supertokens/supertokens-node/pull/135
                await createAndSendEmailUsingSupertokensService(this.appInfo, input.user, input.emailVerifyLink);
            }
        } catch (_) {}
    };
}
