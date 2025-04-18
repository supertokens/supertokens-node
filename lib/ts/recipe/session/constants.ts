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

import { TokenTransferMethod } from "./types";

export const REFRESH_API_PATH = "/session/refresh";
export const SIGNOUT_API_PATH = "/signout";

export const availableTokenTransferMethods: TokenTransferMethod[] = ["cookie", "header"];

export const oneYearInMs = 31536000000;

export const JWKCacheCooldownInMs = 500;

export const protectedProps = [
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
export const authorizationHeaderKey = "authorization";
export const accessTokenHeaderKey = "st-access-token";
export const accessTokenCookieKey = "sAccessToken";
export const refreshTokenCookieKey = "sRefreshToken";
export const refreshTokenHeaderKey = "st-refresh-token";

export const antiCsrfHeaderKey = "anti-csrf";

export const frontTokenHeaderKey = "front-token";

export const authModeHeaderKey = "st-auth-mode";
