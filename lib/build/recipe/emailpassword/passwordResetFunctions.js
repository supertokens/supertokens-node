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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
function getResetPasswordURL(appInfo) {
    return (_) => __awaiter(this, void 0, void 0, function* () {
        // according to https://github.com/supertokens/supertokens-auth-react/issues/6
        return (appInfo.websiteDomain.getAsStringDangerous() +
            appInfo.websiteBasePath.getAsStringDangerous() +
            "/reset-password");
    });
}
exports.getResetPasswordURL = getResetPasswordURL;
function createAndSendCustomEmail(appInfo) {
    return (user, passwordResetURLWithToken) => __awaiter(this, void 0, void 0, function* () {
        // related issue: https://github.com/supertokens/supertokens-node/issues/38
        if (process.env.TEST_MODE === "testing") {
            return;
        }
        try {
            yield axios_1.default({
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
        }
        catch (ignored) { }
    });
}
exports.createAndSendCustomEmail = createAndSendCustomEmail;
