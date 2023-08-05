"use strict";
/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const version_1 = require("../../version");
const utils_1 = require("./utils");
function getRecipeImplementation() {
    return {
        getDashboardBundleLocation: async function () {
            return `https://cdn.jsdelivr.net/gh/supertokens/dashboard@v${version_1.dashboardVersion}/build/`;
        },
        shouldAllowAccess: async function (input) {
            var _a;
            // For cases where we're not using the API key, the JWT is being used; we allow their access by default
            if (!input.config.apiKey) {
                // make the check for the API endpoint here with querier
                let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                const authHeaderValue =
                    (_a = input.req.getHeaderValue("authorization")) === null || _a === void 0
                        ? void 0
                        : _a.split(" ")[1];
                const sessionVerificationResponse = await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/dashboard/session/verify"),
                    {
                        sessionId: authHeaderValue,
                    }
                );
                return sessionVerificationResponse.status === "OK";
            }
            return await utils_1.validateApiKey(input);
        },
    };
}
exports.default = getRecipeImplementation;
