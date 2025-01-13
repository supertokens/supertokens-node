"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendEmailUsingSupertokensService = createAndSendEmailUsingSupertokensService;
const utils_1 = require("../../utils");
async function createAndSendEmailUsingSupertokensService(appInfo, user, passwordResetURLWithToken) {
    // related issue: https://github.com/supertokens/supertokens-node/issues/38
    if ((0, utils_1.isTestEnv)()) {
        return;
    }
    await (0, utils_1.postWithFetch)(
        "https://api.supertokens.io/0/st/auth/password/reset",
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            email: user.email,
            appName: appInfo.appName,
            passwordResetURL: passwordResetURLWithToken,
        },
        {
            successLog: `Password reset email sent to ${user.email}`,
            errorLogHeader: "Error sending password reset email",
        }
    );
}
