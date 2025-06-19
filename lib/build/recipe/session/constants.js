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
exports.authModeHeaderKey = exports.frontTokenHeaderKey = exports.antiCsrfHeaderKey = exports.refreshTokenHeaderKey = exports.refreshTokenCookieKey = exports.accessTokenCookieKey = exports.accessTokenHeaderKey = exports.authorizationHeaderKey = exports.protectedProps = exports.JWKCacheCooldownInMs = exports.oneYearInMs = exports.availableTokenTransferMethods = exports.SIGNOUT_API_PATH = exports.REFRESH_API_PATH = void 0;
exports.REFRESH_API_PATH = "/session/refresh";
exports.SIGNOUT_API_PATH = "/signout";
exports.availableTokenTransferMethods = ["cookie", "header"];
exports.oneYearInMs = 31536000000;
exports.JWKCacheCooldownInMs = 500;
exports.protectedProps = [
    "sub",
    "iat",
    "exp",
    "sessionHandle",
    "parentRefreshTokenHash1",
    "refreshTokenHash1",
    "antiCsrfToken",
    "rsub",
    "tId",
    "stt",
];
exports.authorizationHeaderKey = "authorization";
exports.accessTokenHeaderKey = "st-access-token";
exports.accessTokenCookieKey = "sAccessToken";
exports.refreshTokenCookieKey = "sRefreshToken";
exports.refreshTokenHeaderKey = "st-refresh-token";
exports.antiCsrfHeaderKey = "anti-csrf";
exports.frontTokenHeaderKey = "front-token";
exports.authModeHeaderKey = "st-auth-mode";
