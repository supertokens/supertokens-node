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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../recipe"));
const utils_1 = require("../../../utils");
const __1 = require("../../..");
async function userInfoGET(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.userInfoGET === undefined) {
        return false;
    }
    const authHeader = options.req.getHeaderValue("authorization") || options.req.getHeaderValue("Authorization");
    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        // TODO: Returning a 400 instead of a 401 to prevent a potential refresh loop in the client SDK.
        // When addressing this TODO, review other response codes in this function as well.
        utils_1.sendNon200ResponseWithMessage(options.res, "Missing or invalid Authorization header", 400);
        return true;
    }
    const accessToken = authHeader.replace(/^Bearer /, "").trim();
    let accessTokenPayload;
    try {
        accessTokenPayload = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.validateOAuth2AccessToken({
                token: accessToken,
                // TODO: expectedAudience?
                userContext,
            });
    } catch (error) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        utils_1.sendNon200ResponseWithMessage(options.res, "Invalid or expired OAuth2 access token", 400);
        return true;
    }
    if (
        accessTokenPayload === null ||
        typeof accessTokenPayload !== "object" ||
        typeof accessTokenPayload.sub !== "string" ||
        typeof accessTokenPayload.scope !== "string"
    ) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        utils_1.sendNon200ResponseWithMessage(options.res, "Malformed access token payload", 400);
        return true;
    }
    const userId = accessTokenPayload.sub;
    const user = await __1.getUser(userId, userContext);
    if (user === undefined) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        utils_1.sendNon200ResponseWithMessage(
            options.res,
            "Couldn't find any user associated with the access token",
            400
        );
        return true;
    }
    const response = await apiImplementation.userInfoGET({
        accessTokenPayload,
        user,
        tenantId,
        scopes: accessTokenPayload.scope.split(" "),
        options,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.default = userInfoGET;
