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
exports.endSessionPOST = exports.endSessionGET = void 0;
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
async function endSessionGET(apiImplementation, options, userContext) {
    if (apiImplementation.endSessionGET === undefined) {
        return false;
    }
    const origURL = options.req.getOriginalURL();
    const splitURL = origURL.split("?");
    const params = new URLSearchParams(splitURL[1]);
    return endSessionCommon(
        Object.fromEntries(params.entries()),
        apiImplementation.endSessionGET,
        options,
        userContext
    );
}
exports.endSessionGET = endSessionGET;
async function endSessionPOST(apiImplementation, options, userContext) {
    if (apiImplementation.endSessionPOST === undefined) {
        return false;
    }
    const params = await options.req.getBodyAsJSONOrFormData();
    return endSessionCommon(params, apiImplementation.endSessionPOST, options, userContext);
}
exports.endSessionPOST = endSessionPOST;
async function endSessionCommon(params, apiImplementation, options, userContext) {
    if (apiImplementation === undefined) {
        return false;
    }
    // TODO: Validate client_id if passed
    let session;
    try {
        session = await session_1.default.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch (_a) {
        session = undefined;
    }
    let response = await apiImplementation({
        options,
        params,
        session,
        userContext,
    });
    if ("redirectTo" in response) {
        // TODO: Fix
        if (response.redirectTo.includes("/oauth/fallbacks/error")) {
            const redirectToUrlObj = new URL(response.redirectTo);
            const res = {
                error: redirectToUrlObj.searchParams.get("error"),
                errorDescription: redirectToUrlObj.searchParams.get("error_description"),
            };
            utils_1.sendNon200Response(options.res, 400, res);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    } else {
        utils_1.send200Response(options.res, response);
    }
    return true;
}
