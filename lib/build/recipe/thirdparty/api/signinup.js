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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = signInUpAPI;
const error_1 = __importDefault(require("../error"));
const utils_1 = require("../../../utils");
const authUtils_1 = require("../../../authUtils");
async function signInUpAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.signInUpPOST === undefined) {
        return false;
    }
    const bodyParams = await options.req.getJSONBody();
    const thirdPartyId = bodyParams.thirdPartyId;
    const clientType = bodyParams.clientType;
    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId in request body",
        });
    }
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
    const providerResponse = await options.recipeImplementation.getProvider({
        thirdPartyId,
        tenantId,
        clientType,
        userContext,
    });
    if (providerResponse === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: `the provider ${thirdPartyId} could not be found in the configuration`,
        });
    }
    const provider = providerResponse;
    const shouldTryLinkingWithSessionUser = (0, utils_1.getNormalisedShouldTryLinkingWithSessionUserFlag)(
        options.req,
        bodyParams
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
    let result = await apiImplementation.signInUpPOST({
        provider,
        redirectURIInfo,
        oAuthTokens,
        tenantId,
        session,
        shouldTryLinkingWithSessionUser,
        options,
        userContext,
    });
    if (result.status === "OK") {
        (0, utils_1.send200Response)(
            options.res,
            Object.assign(
                { status: result.status },
                (0, utils_1.getBackwardsCompatibleUserInfo)(options.req, result, userContext)
            )
        );
    } else {
        (0, utils_1.send200Response)(options.res, result);
    }
    return true;
}
