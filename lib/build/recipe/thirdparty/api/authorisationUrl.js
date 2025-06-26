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
exports.default = authorisationUrlAPI;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
async function authorisationUrlAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.authorisationUrlGET === undefined) {
        return false;
    }
    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");
    const redirectURIOnProviderDashboard = options.req.getKeyValueFromQuery("redirectURIOnProviderDashboard");
    const clientType = options.req.getKeyValueFromQuery("clientType");
    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId as a GET param",
        });
    }
    if (redirectURIOnProviderDashboard === undefined || typeof redirectURIOnProviderDashboard !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the redirectURIOnProviderDashboard as a GET param",
        });
    }
    const providerResponse = await options.recipeImplementation.getProvider({
        thirdPartyId,
        clientType,
        tenantId,
        userContext,
    });
    if (providerResponse === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: `the provider ${thirdPartyId} could not be found in the configuration`,
        });
    }
    const provider = providerResponse;
    let result = await apiImplementation.authorisationUrlGET({
        provider,
        redirectURIOnProviderDashboard,
        tenantId,
        options,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
