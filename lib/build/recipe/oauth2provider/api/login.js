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
exports.default = login;
const set_cookie_parser_1 = __importDefault(require("set-cookie-parser"));
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
const error_1 = __importDefault(require("../../../error"));
const error_2 = __importDefault(require("../../../recipe/session/error"));
async function login(apiImplementation, options, userContext) {
    var _a, _b;
    if (apiImplementation.loginGET === undefined) {
        return false;
    }
    let session, shouldTryRefresh;
    try {
        session = await session_1.default.getSession(options.req, options.res, { sessionRequired: false }, userContext);
        shouldTryRefresh = false;
    } catch (error) {
        // We can handle this as if the session is not present, because then we redirect to the frontend,
        // which should handle the validation error
        session = undefined;
        if (error_1.default.isErrorFromSuperTokens(error) && error.type === error_2.default.TRY_REFRESH_TOKEN) {
            shouldTryRefresh = true;
        } else {
            shouldTryRefresh = false;
        }
    }
    const loginChallenge =
        (_a = options.req.getKeyValueFromQuery("login_challenge")) !== null && _a !== void 0
            ? _a
            : options.req.getKeyValueFromQuery("loginChallenge");
    if (loginChallenge === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Missing input param: loginChallenge",
        });
    }
    let response = await apiImplementation.loginGET({
        options,
        loginChallenge,
        session,
        shouldTryRefresh,
        userContext,
    });
    if ("frontendRedirectTo" in response) {
        if (response.cookies) {
            const cookieStr = set_cookie_parser_1.default.splitCookiesString(response.cookies);
            const cookies = set_cookie_parser_1.default.parse(cookieStr);
            for (const cookie of cookies) {
                options.res.setCookie(
                    cookie.name,
                    cookie.value,
                    cookie.domain,
                    !!cookie.secure,
                    !!cookie.httpOnly,
                    new Date(cookie.expires).getTime(),
                    cookie.path || "/",
                    cookie.sameSite
                );
            }
        }
        (0, utils_1.send200Response)(options.res, {
            frontendRedirectTo: response.frontendRedirectTo,
        });
    } else if ("statusCode" in response) {
        // We want to avoid returning a 401 to the frontend, as it may trigger a refresh loop
        if (response.statusCode === 401) {
            response.statusCode = 400;
        }
        (0, utils_1.sendNon200Response)(options.res, (_b = response.statusCode) !== null && _b !== void 0 ? _b : 400, {
            error: response.error,
            error_description: response.errorDescription,
        });
    } else {
        (0, utils_1.send200Response)(options.res, response);
    }
    return true;
}
