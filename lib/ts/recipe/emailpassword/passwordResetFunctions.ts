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
import axios, { AxiosError } from "axios";
import { logDebugMessage } from "../../logger";

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
            logDebugMessage(`Password reset email sent to ${user.email}`);
        } catch (error) {
            logDebugMessage("Error sending password reset email");
            if (axios.isAxiosError(error)) {
                const err = error as AxiosError;
                if (err.response) {
                    logDebugMessage(`Error status: ${err.response.status}`);
                    logDebugMessage(`Error response: ${JSON.stringify(err.response.data)}`);
                } else {
                    logDebugMessage(`Error: ${err.message}`);
                }
            } else {
                logDebugMessage(`Error: ${JSON.stringify(error)}`);
            }
            logDebugMessage("Logging the input below:");
            logDebugMessage(
                JSON.stringify(
                    {
                        email: user.email,
                        appName: appInfo.appName,
                        passwordResetURL: passwordResetURLWithToken,
                    },
                    null,
                    2
                )
            );
        }
    };
}
