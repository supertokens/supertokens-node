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
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { createAndSendEmailUsingSupertokensService } from "../../../passwordResetFunctions";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private isInServerlessEnv: boolean;
    private appInfo: NormalisedAppinfo;

    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) {
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
    }

    sendEmail = async (input: TypeEmailPasswordEmailDeliveryInput & { userContext: any }) => {
        // we add this here cause the user may have overridden the sendEmail function
        // to change the input email and if we don't do this, the input email
        // will get reset by the getUserById call above.
        try {
            if (!this.isInServerlessEnv) {
                createAndSendEmailUsingSupertokensService(
                    this.appInfo,
                    input.user,
                    input.passwordResetLink
                ).catch((_) => {});
            } else {
                // see https://github.com/supertokens/supertokens-node/pull/135
                await createAndSendEmailUsingSupertokensService(this.appInfo, input.user, input.passwordResetLink);
            }
        } catch (_) {}
    };
}
