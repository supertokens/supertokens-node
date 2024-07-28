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
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
// TODO: separate post and get?
async function login(apiImplementation, options, userContext) {
    var _a;
    if (utils_1.normaliseHttpMethod(options.req.getMethod()) === "post") {
        if (apiImplementation.loginPOST === undefined) {
            return false;
        }
        const session = await session_1.default.getSession(
            options.req,
            options.res,
            { sessionRequired: true },
            userContext
        );
        const reqBody = await options.req.getJSONBody();
        let response = await apiImplementation.loginPOST({
            options,
            accept: reqBody.accept,
            loginChallenge: reqBody.loginChallenge,
            session,
            userContext,
        });
        if ("status" in response) {
            utils_1.send200Response(options.res, response);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    } else {
        if (apiImplementation.loginGET === undefined) {
            return false;
        }
        let session;
        try {
            session = await session_1.default.getSession(
                options.req,
                options.res,
                { sessionRequired: false },
                userContext
            );
        } catch (_b) {
            // TODO: Claim validation failure
        }
        // TODO: take only one
        const loginChallenge =
            (_a = options.req.getKeyValueFromQuery("login_challenge")) !== null && _a !== void 0
                ? _a
                : options.req.getKeyValueFromQuery("loginChallenge");
        if (loginChallenge === undefined) {
            throw new Error("TODO");
        }
        let response = await apiImplementation.loginGET({
            options,
            loginChallenge,
            session,
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
exports.default = login;
