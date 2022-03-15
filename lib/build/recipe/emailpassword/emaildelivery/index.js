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
const passwordResetFunctions_1 = require("../passwordResetFunctions");
const emaildelivery_1 = require("../../emailverification/emaildelivery");
function getNormaliseAndInvokeDefaultCreateAndSendCustomEmail(
    recipeInstance,
    appInfo,
    input,
    resetPasswordUsingTokenFeature,
    emailVerificationFeature
) {
    return __awaiter(this, void 0, void 0, function* () {
        if (input.type === "EMAIL_VERIFICATION") {
            const inputCreateAndSendCustomEmail =
                emailVerificationFeature === null || emailVerificationFeature === void 0
                    ? void 0
                    : emailVerificationFeature.createAndSendCustomEmail;
            let createAndSendCustomEmail = undefined;
            if (inputCreateAndSendCustomEmail !== undefined) {
                createAndSendCustomEmail = (user, link, userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({
                            userId: user.id,
                            userContext,
                        });
                        if (userInfo === undefined) {
                            throw new Error("Unknown User ID provided");
                        }
                        return yield inputCreateAndSendCustomEmail(userInfo, link, userContext);
                    });
            }
            return yield normaliseAndInvokeDefaultCreateAndSendCustomEmail(
                appInfo,
                input,
                recipeInstance.isInServerlessEnv,
                resetPasswordUsingTokenFeature,
                {
                    createAndSendCustomEmail,
                }
            );
        }
        return yield normaliseAndInvokeDefaultCreateAndSendCustomEmail(
            appInfo,
            input,
            recipeInstance.isInServerlessEnv,
            resetPasswordUsingTokenFeature,
            undefined
        );
    });
}
exports.getNormaliseAndInvokeDefaultCreateAndSendCustomEmail = getNormaliseAndInvokeDefaultCreateAndSendCustomEmail;
function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    appInfo,
    input,
    isInServerlessEnv,
    resetPasswordUsingTokenFeature,
    emailVerificationFeature
) {
    return __awaiter(this, void 0, void 0, function* () {
        if (input.type === "EMAIL_VERIFICATION") {
            yield emaildelivery_1.normaliseAndInvokeDefaultCreateAndSendCustomEmail(
                appInfo,
                input,
                isInServerlessEnv,
                emailVerificationFeature === null || emailVerificationFeature === void 0
                    ? void 0
                    : emailVerificationFeature.createAndSendCustomEmail
            );
        } else {
            let createAndSendCustomEmail =
                resetPasswordUsingTokenFeature === null || resetPasswordUsingTokenFeature === void 0
                    ? void 0
                    : resetPasswordUsingTokenFeature.createAndSendCustomEmail;
            if (createAndSendCustomEmail === undefined) {
                createAndSendCustomEmail = passwordResetFunctions_1.createAndSendCustomEmail(appInfo);
            }
            try {
                if (!isInServerlessEnv) {
                    createAndSendCustomEmail(input.user, input.passwordResetLink, input.userContext).catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    yield createAndSendCustomEmail(input.user, input.passwordResetLink, input.userContext);
                }
            } catch (_) {}
        }
    });
}
exports.normaliseAndInvokeDefaultCreateAndSendCustomEmail = normaliseAndInvokeDefaultCreateAndSendCustomEmail;
