/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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

import { User } from "./types";
import { NormalisedAppinfo } from "../../types";
import axios from "axios";

export function getEmailVerificationURL(appInfo: NormalisedAppinfo) {
    return async (ignored: User): Promise<string> => {
        return (
            appInfo.websiteDomain.getAsStringDangerous() +
            appInfo.websiteBasePath.getAsStringDangerous() +
            "/verify-email"
        );
    };
}

export function createAndSendCustomEmail(appInfo: NormalisedAppinfo) {
    return async (user: User, emailVerifyURLWithToken: string) => {
        try {
            await axios({
                method: "POST",
                url: "https://api.supertokens.io/0/st/auth/email/verify",
                data: {
                    email: user.email,
                    appName: appInfo.appName,
                    emailVerifyURL: emailVerifyURLWithToken,
                },
                headers: {
                    "api-version": 0,
                },
            });
        } catch (ignored) {}
    };
}
