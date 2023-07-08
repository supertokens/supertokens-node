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
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
import { postWithFetch } from "../../../../../utils";

async function createAndSendEmailUsingSupertokensService(input: {
    appInfo: NormalisedAppinfo;
    // Where the message should be delivered.
    email: string;
    // This has to be entered on the starting device  to finish sign in/up
    userInputCode?: string;
    // Full url that the end-user can click to finish sign in/up
    urlWithLinkCode?: string;
    codeLifetime: number;
}): Promise<void> {
    if (process.env.TEST_MODE === "testing") {
        return;
    }
    const result = await postWithFetch(
        "https://api.supertokens.io/0/st/auth/passwordless/login",
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            email: input.email,
            appName: input.appInfo.appName,
            codeLifetime: input.codeLifetime,
            urlWithLinkCode: input.urlWithLinkCode,
            userInputCode: input.userInputCode,
        },
        {
            successLog: `Email sent to ${input.email}`,
            errorLogHeader: "Error sending passwordless login email",
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

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput> {
    private appInfo: NormalisedAppinfo;

    constructor(appInfo: NormalisedAppinfo) {
        this.appInfo = appInfo;
    }

    sendEmail = async (input: TypePasswordlessEmailDeliveryInput & { userContext: any }) => {
        await createAndSendEmailUsingSupertokensService({
            appInfo: this.appInfo,
            email: input.email,
            userInputCode: input.userInputCode,
            urlWithLinkCode: input.urlWithLinkCode,
            codeLifetime: input.codeLifetime,
        });
    };
}
