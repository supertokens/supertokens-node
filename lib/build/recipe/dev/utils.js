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
const utils_1 = require("../../utils");
// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
    "467101b197249757c71f",
];
const DEV_KEY_IDENTIFIER = "4398792-";
function isUsingDevelopmentClientId() {
    for (let i = 0; i < utils_1.thirdPartyProvidersClientIds.length; i++) {
        if (
            utils_1.thirdPartyProvidersClientIds[i].startsWith(DEV_KEY_IDENTIFIER) ||
            DEV_OAUTH_CLIENT_IDS.includes(utils_1.thirdPartyProvidersClientIds[i])
        ) {
            return true;
        }
    }
    return false;
}
exports.isUsingDevelopmentClientId = isUsingDevelopmentClientId;
