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
import { TypeWebauthnEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { isTestEnv, postWithFetch } from "../../../../../utils";

async function createAndSendEmailUsingSupertokensService(input: {
    appInfo: NormalisedAppinfo;
    // Where the message should be delivered.
    user: { email: string; id: string };
    // This has to be entered on the starting device  to finish sign in/up
    recoverAccountLink: string;
}): Promise<void> {
    if (isTestEnv()) {
        return;
    }
    const result = await postWithFetch(
        "https://api.supertokens.io/0/st/auth/webauthn/recover",
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            email: input.user.email,
            appName: input.appInfo.appName,
            recoverAccountURL: input.recoverAccountLink,
        },
        {
            successLog: `Email sent to ${input.user.email}`,
            errorLogHeader: "Error sending webauthn recover account email",
        }
    );
    if ("error" in result) {
        throw result.error;
    }

    if (result.resp && result.resp.status >= 400) {
        if (result.resp.body.err) {
            /**
             * if the error is thrown from API, the response object
             * will be of type `{err: string}`
             */
            throw new Error(result.resp.body.err);
        } else {
            throw new Error(`Request failed with status code ${result.resp.status}`);
        }
    }
}

export default class BackwardCompatibilityService implements EmailDeliveryInterface<TypeWebauthnEmailDeliveryInput> {
    private isInServerlessEnv: boolean;
    private appInfo: NormalisedAppinfo;

    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) {
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
    }

    sendEmail = async (input: TypeWebauthnEmailDeliveryInput & { userContext: UserContext }) => {
        // we add this here cause the user may have overridden the sendEmail function
        // to change the input email and if we don't do this, the input email
        // will get reset by the getUserById call above.
        try {
            if (!this.isInServerlessEnv) {
                createAndSendEmailUsingSupertokensService({
                    appInfo: this.appInfo,
                    user: input.user,
                    recoverAccountLink: input.recoverAccountLink,
                }).catch((_) => {});
            } else {
                // see https://github.com/supertokens/supertokens-node/pull/135
                await createAndSendEmailUsingSupertokensService({
                    appInfo: this.appInfo,
                    user: input.user,
                    recoverAccountLink: input.recoverAccountLink,
                });
            }
        } catch (_) {}
    };
}
