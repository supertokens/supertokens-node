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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const logger_1 = require("../../logger");
function getEmailVerificationURL(appInfo) {
    return (_) =>
        __awaiter(this, void 0, void 0, function* () {
            return (
                appInfo.websiteDomain.getAsStringDangerous() +
                appInfo.websiteBasePath.getAsStringDangerous() +
                "/verify-email"
            );
        });
}
exports.getEmailVerificationURL = getEmailVerificationURL;
function createAndSendCustomEmail(appInfo) {
    return (user, emailVerifyURLWithToken) =>
        __awaiter(this, void 0, void 0, function* () {
            if (process.env.TEST_MODE === "testing") {
                return;
            }
            try {
                yield axios_1.default({
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
                logger_1.logDebugMessage(`Email sent to ${user.email}`);
            } catch (error) {
                logger_1.logDebugMessage("Error sending verification email");
                if (axios_1.default.isAxiosError(error)) {
                    const err = error;
                    if (err.response) {
                        logger_1.logDebugMessage(`Error status: ${err.response.status}`);
                        logger_1.logDebugMessage(`Error response: ${JSON.stringify(err.response.data)}`);
                    } else {
                        logger_1.logDebugMessage(`Error: ${err.message}`);
                    }
                } else {
                    logger_1.logDebugMessage(`Error: ${JSON.stringify(error)}`);
                }
                logger_1.logDebugMessage("Logging the input below:");
                logger_1.logDebugMessage(
                    JSON.stringify(
                        {
                            email: user.email,
                            appName: appInfo.appName,
                            emailVerifyURL: emailVerifyURLWithToken,
                        },
                        null,
                        2
                    )
                );
            }
        });
}
exports.createAndSendCustomEmail = createAndSendCustomEmail;
