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
const emailVerificationFunctions_1 = require("./emailVerificationFunctions");
function validateAndNormaliseUserInput(_, appInfo, config) {
    let getEmailVerificationURL =
        config.getEmailVerificationURL === undefined
            ? emailVerificationFunctions_1.getEmailVerificationURL(appInfo)
            : config.getEmailVerificationURL;
    let createAndSendCustomEmail =
        config.createAndSendCustomEmail === undefined
            ? emailVerificationFunctions_1.createAndSendCustomEmail(appInfo)
            : config.createAndSendCustomEmail;
    let getEmailForUserId = config.getEmailForUserId;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    return {
        getEmailForUserId,
        getEmailVerificationURL,
        createAndSendCustomEmail,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
