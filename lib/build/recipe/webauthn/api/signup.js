"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.default = signUpAPI;
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
const authUtils_1 = require("../../../authUtils");
async function signUpAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.signUpPOST === undefined) {
        return false;
    }
    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = (0, utils_2.validateWebauthnGeneratedOptionsIdOrThrowError)(
        requestBody.webauthnGeneratedOptionsId
    );
    const credential = (0, utils_2.validateCredentialOrThrowError)(requestBody.credential);
    const shouldTryLinkingWithSessionUser = (0, utils_1.getNormalisedShouldTryLinkingWithSessionUserFlag)(
        options.req,
        requestBody
    );
    const session = await authUtils_1.AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );
    if (session !== undefined) {
        tenantId = session.getTenantId();
    }
    const result = await apiImplementation.signUpPOST({
        credential,
        webauthnGeneratedOptionsId,
        tenantId,
        session,
        shouldTryLinkingWithSessionUser,
        options,
        userContext: userContext,
    });
    if (result.status === "OK") {
        (0, utils_1.send200Response)(
            options.res,
            Object.assign(
                { status: "OK" },
                (0, utils_1.getBackwardsCompatibleUserInfo)(options.req, result, userContext)
            )
        );
    } else {
        (0, utils_1.send200Response)(options.res, result);
    }
    return true;
}
