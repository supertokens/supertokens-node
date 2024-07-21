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
const __1 = require("../../..");
// TODO: Replace stub implementation by the actual implementation
async function validateOAuth2AccessToken(accessToken) {
    const resp = await fetch(`http://localhost:4445/admin/oauth2/introspect`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: accessToken }),
    });
    return await resp.json();
}
async function userInfoGET(apiImplementation, options, userContext) {
    var _a;
    if (apiImplementation.userInfoGET === undefined) {
        return false;
    }
    const authHeader = options.req.getHeaderValue("authorization") || options.req.getHeaderValue("Authorization");
    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        utils_1.sendNon200ResponseWithMessage(options.res, "Missing or invalid Authorization header", 401);
        return true;
    }
    const accessToken = authHeader.replace(/^Bearer /, "").trim();
    let accessTokenPayload;
    try {
        accessTokenPayload = await validateOAuth2AccessToken(accessToken);
    } catch (error) {
        utils_1.sendNon200ResponseWithMessage(options.res, "Invalid or expired OAuth2 access token!", 401);
        return true;
    }
    const userId = accessTokenPayload.sub;
    const user = await __1.getUser(userId, userContext);
    if (user === undefined) {
        utils_1.sendNon200ResponseWithMessage(
            options.res,
            "Couldn't find any user associated with the access token",
            401
        );
        return true;
    }
    const response = await apiImplementation.userInfoGET({
        accessTokenPayload,
        user,
        scopes: ((_a = accessTokenPayload.scope) !== null && _a !== void 0 ? _a : "").split(" "),
        options,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.default = userInfoGET;
