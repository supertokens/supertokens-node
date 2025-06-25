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
exports.default = userInfoGET;
const recipe_1 = __importDefault(require("../recipe"));
const utils_1 = require("../../../utils");
const __1 = require("../../..");
async function userInfoGET(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.userInfoGET === undefined) {
        return false;
    }
    const authHeader = options.req.getHeaderValue("authorization");
    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        (0, utils_1.sendNon200ResponseWithMessage)(options.res, "Missing or invalid Authorization header", 401);
        return true;
    }
    const accessToken = authHeader.replace(/^Bearer /, "").trim();
    let accessTokenPayload;
    try {
        const validateTokenResponse = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.validateOAuth2AccessToken({
                token: accessToken,
                userContext,
            });
        accessTokenPayload = validateTokenResponse.payload;
    } catch (error) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        (0, utils_1.sendNon200ResponseWithMessage)(options.res, "Invalid or expired OAuth2 access token", 401);
        return true;
    }
    if (
        accessTokenPayload === null ||
        typeof accessTokenPayload !== "object" ||
        typeof accessTokenPayload.sub !== "string" ||
        !Array.isArray(accessTokenPayload.scp)
    ) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        (0, utils_1.sendNon200ResponseWithMessage)(options.res, "Malformed access token payload", 401);
        return true;
    }
    const userId = accessTokenPayload.sub;
    const user = await (0, __1.getUser)(userId, userContext);
    if (user === undefined) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        (0, utils_1.sendNon200ResponseWithMessage)(
            options.res,
            "Couldn't find any user associated with the access token",
            401
        );
        return true;
    }
    const response = await apiImplementation.userInfoGET({
        accessTokenPayload,
        user,
        tenantId,
        scopes: accessTokenPayload.scp,
        options,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, response);
    return true;
}
