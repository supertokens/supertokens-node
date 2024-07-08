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
const error_1 = __importDefault(require("../../../error"));
const utils_1 = require("../../../utils");
const session_1 = __importDefault(require("../../session"));
async function signInAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.signInPOST === undefined) {
        return false;
    }
    const bodyParams = await options.req.getJSONBody();
    let redirectURIInfo;
    let oAuthTokens;
    if (bodyParams.redirectURIInfo !== undefined) {
        if (bodyParams.redirectURIInfo.redirectURIOnProviderDashboard === undefined) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the redirectURIOnProviderDashboard in request body",
            });
        }
        redirectURIInfo = bodyParams.redirectURIInfo;
    } else if (bodyParams.oAuthTokens !== undefined) {
        oAuthTokens = bodyParams.oAuthTokens;
    } else {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide one of redirectURIInfo or oAuthTokens in the request body",
        });
    }
    let session = await session_1.default.getSession(
        options.req,
        options.res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );
    if (session !== undefined) {
        tenantId = session.getTenantId();
    }
    let result = await apiImplementation.signInPOST({
        tenantId,
        redirectURIInfo,
        oAuthTokens,
        session,
        options,
        userContext,
    });
    if (result.status === "OK") {
        utils_1.send200Response(
            options.res,
            Object.assign(
                { status: result.status },
                utils_1.getBackwardsCompatibleUserInfo(options.req, result, userContext)
            )
        );
    } else {
        utils_1.send200Response(options.res, result);
    }
    return true;
}
exports.default = signInAPI;
