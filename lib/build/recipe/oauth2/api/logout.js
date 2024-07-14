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
// TODO: separate post and get?
async function logout(apiImplementation, options, userContext) {
    if (utils_1.normaliseHttpMethod(options.req.getMethod()) === "post") {
        if (apiImplementation.logoutPOST === undefined) {
            return false;
        }
        const reqBody = await options.req.getJSONBody();
        let response = await apiImplementation.logoutPOST({
            options,
            accept: reqBody.accept,
            logoutChallenge: reqBody.logoutChallenge,
            userContext,
        });
        if ("status" in response) {
            utils_1.send200Response(options.res, response);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    } else {
        if (apiImplementation.logoutGET === undefined) {
            return false;
        }
        const logoutChallenge = options.req.getKeyValueFromQuery("logoutChallenge");
        if (logoutChallenge === undefined) {
            throw new Error("TODO");
        }
        let response = await apiImplementation.logoutGET({
            options,
            logoutChallenge,
            userContext,
        });
        if ("status" in response) {
            utils_1.send200Response(options.res, response);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    }
    return true;
}
exports.default = logout;
