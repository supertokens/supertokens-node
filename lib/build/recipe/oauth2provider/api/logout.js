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
exports.logoutPOST = exports.logoutGET = void 0;
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
const error_1 = __importDefault(require("../../../error"));
async function logoutGET(apiImplementation, options, userContext) {
    var _a;
    if (apiImplementation.logoutGET === undefined) {
        return false;
    }
    let session;
    try {
        session = await session_1.default.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch (_b) {
        session = undefined;
    }
    const logoutChallenge =
        (_a = options.req.getKeyValueFromQuery("logout_challenge")) !== null && _a !== void 0
            ? _a
            : options.req.getKeyValueFromQuery("logoutChallenge");
    if (logoutChallenge === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Missing input param: logoutChallenge",
        });
    }
    let response = await apiImplementation.logoutGET({
        options,
        logoutChallenge,
        session,
        userContext,
    });
    if ("redirectTo" in response) {
        options.res.original.redirect(response.redirectTo);
    } else {
        utils_1.send200Response(options.res, response);
    }
    return true;
}
exports.logoutGET = logoutGET;
async function logoutPOST(apiImplementation, options, userContext) {
    if (apiImplementation.logoutPOST === undefined) {
        return false;
    }
    let session;
    try {
        session = await session_1.default.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch (_a) {
        session = undefined;
    }
    const body = await options.req.getBodyAsJSONOrFormData();
    if (body.logoutChallenge === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Missing body param: logoutChallenge",
        });
    }
    let response = await apiImplementation.logoutPOST({
        options,
        logoutChallenge: body.logoutChallenge,
        session,
        userContext,
    });
    utils_1.send200Response(options.res, response);
    return true;
}
exports.logoutPOST = logoutPOST;
