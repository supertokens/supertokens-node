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
const SUPERTOKENS_DEBUG_NAMESPACE = "com.supertokens";
/*
 The debug logger below can be used to log debug messages in the following format
    com.supertokens {t: "2022-03-18T11:15:24.608Z", message: Your message, file: "/home/supertokens-node/lib/build/supertokens.js:231:18" sdkVer: "9.2.0"} +0m
*/
function logDebugMessage(message) {
    if (debug_1.default.enabled(SUPERTOKENS_DEBUG_NAMESPACE)) {
        debug_1.default(SUPERTOKENS_DEBUG_NAMESPACE)(
            `{t: "${new Date().toISOString()}", message: \"${message}\", file: \"${getFileLocation()}\" sdkVer: "${
                version_1.version
            }"}`
        );
        console.log();
    }
}
exports.logDebugMessage = logDebugMessage;
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
