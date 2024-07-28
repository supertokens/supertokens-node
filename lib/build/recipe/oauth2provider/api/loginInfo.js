"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
const utils_1 = require("../../../utils");
async function loginInfoGET(apiImplementation, options, userContext) {
    var _a;
    if (apiImplementation.loginInfoGET === undefined) {
        return false;
    }
    const loginChallenge =
        (_a = options.req.getKeyValueFromQuery("login_challenge")) !== null && _a !== void 0
            ? _a
            : options.req.getKeyValueFromQuery("loginChallenge");
    if (loginChallenge === undefined) {
        throw new Error("TODO");
    }
    let response = await apiImplementation.loginInfoGET({
        options,
        loginChallenge,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.default = loginInfoGET;
