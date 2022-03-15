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
const debug_1 = require("debug");
const version_1 = require("./version");
/*
 The debug logger and info logger defined below use the debug lib to log debug and info messages when the DEBUG env is set with the com.supertokens namespace.
For example:
    Adding a info log to the emailpassword signin api
    Adding a debug log to the SignIn API which will print the status when a non OK response is returned
Flow:
    SignIn with with valid credentials;
    SignIn with invalid credentials
Output: (with DEBUG=com.supertokens:*)
  com.supertokens:info {t: "1647340361090", msg: "SignInAPI is called", code: 2, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:54:69", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647340361295", msg: "SignInAPI replied with status: OK", code: 1, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:65:76", sdkVer: "9.1.0"} +0ms
  com.supertokens:info {t: "1647340563421", msg: "SignInAPI is called", code: 2, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:54:69", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647340563565", msg: "SignInAPI replied with status: WRONG_CREDENTIALS_ERROR", code: 1, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:71:76", sdkVer: "9.1.0"} +0ms
*/
exports.loggerCodes = {
    API_RESPONSE: 1,
    API_CALLED: 2,
};
let logMessage = (namespaceId, message, code) => {
    let fileNameAndLineNumber = getFileLocation();
    let messageWithOptionalCode = `msg: \"${message}\"`;
    if (code != undefined) {
        messageWithOptionalCode = `${messageWithOptionalCode}, code: ${code}`;
    }
    debug_1.default(`com.supertokens:${namespaceId}`)(
        `{t: "${Date.now()}", ${messageWithOptionalCode}, file: \"${fileNameAndLineNumber}\" sdkVer: "${
            version_1.version
        }"}`
    );
};
exports.infoLoggerWithCode = {
    [exports.loggerCodes.API_CALLED]: (apiName) => {
        logMessage("info", `${apiName} is called`, exports.loggerCodes.API_CALLED);
    },
};
exports.debugLoggerWithCode = {
    [exports.loggerCodes.API_RESPONSE]: (apiName, status) => {
        logMessage("debug", `${apiName} replied with status: ${status}`, exports.loggerCodes.API_RESPONSE);
    },
};
let getFileLocation = () => {
    let errorObject = new Error();
    if (errorObject.stack === undefined) {
        // should not come here
        return "N/A";
    }
    // split the error stack into an array with new line as the separator
    let errorStack = errorObject.stack.split("\n");
    // find return the first trace which doesnt have the logger.js file
    for (let i = 1; i < errorStack.length; i++) {
        if (!errorStack[i].includes("logger.js")) {
            // retrieve the string between the parenthesis
            return errorStack[i].match(/(?<=\().+?(?=\))/g);
        }
    }
    return "N/A";
};
