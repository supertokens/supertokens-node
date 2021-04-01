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

import { User } from "./types";
import { NormalisedAppinfo } from "../../types";
import axios from "axios";

export function getResetPasswordURL(appInfo: NormalisedAppinfo) {
    return async (_: User): Promise<string> => {
        // according to https://github.com/supertokens/supertokens-auth-react/issues/6
        return (
            appInfo.websiteDomain.getAsStringDangerous() +
            appInfo.websiteBasePath.getAsStringDangerous() +
            "/reset-password"
        );
    };
}

export function createAndSendCustomEmail(appInfo: NormalisedAppinfo) {
    return async (user: User, passwordResetURLWithToken: string) => {
        // related issue: https://github.com/supertokens/supertokens-node/issues/38
        if (process.env.TEST_MODE === "testing") {
            return;
        }
        try {
            await axios({
                method: "POST",
                url: "https://api.supertokens.io/0/st/auth/password/reset",
                data: {
                    email: user.email,
                    appName: appInfo.appName,
                    passwordResetURL: passwordResetURLWithToken,
                },
                headers: {
                    "api-version": 0,
                },
            });
        } catch (ignored) {}
    };
}
