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
exports.default = getRecipeImplementation;
const error_1 = __importDefault(require("./error"));
const logger_1 = require("../../logger");
const querier_1 = require("../../querier");
const utils_1 = require("../../utils");
const version_1 = require("../../version");
const constants_1 = require("./constants");
const utils_2 = require("./utils");
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
                    "/recipe/dashboard/session/verify",
                    {
                        sessionId: authHeaderValue,
                    },
                    input.userContext
                );
                if (sessionVerificationResponse.status !== "OK") {
                    return false;
                }
                // For all non GET requests we also want to check if the user is allowed to perform this operation
                if ((0, utils_1.normaliseHttpMethod)(input.req.getMethod()) !== "get") {
                    // We dont want to block the analytics API
                    if (input.req.getOriginalURL().endsWith(constants_1.DASHBOARD_ANALYTICS_API)) {
                        return true;
                    }
                    // We do not want to block the sign out request
                    if (input.req.getOriginalURL().endsWith(constants_1.SIGN_OUT_API)) {
                        return true;
                    }
                    const admins = input.config.admins;
                    if (admins === undefined) {
                        return true;
                    }
                    if (admins.length === 0) {
                        (0, logger_1.logDebugMessage)(
                            "User Dashboard: Throwing OPERATION_NOT_ALLOWED because user is not an admin"
                        );
                        throw new error_1.default();
                    }
                    const userEmail = sessionVerificationResponse.email;
                    if (userEmail === undefined || typeof userEmail !== "string") {
                        (0, logger_1.logDebugMessage)(
                            "User Dashboard: Returning Unauthorised because no email was returned from the core. Should never come here"
                        );
                        return false;
                    }
                    if (!admins.includes(userEmail)) {
                        (0, logger_1.logDebugMessage)(
                            "User Dashboard: Throwing OPERATION_NOT_ALLOWED because user is not an admin"
                        );
                        throw new error_1.default();
                    }
                }
                return true;
            }
            return await (0, utils_2.validateApiKey)(input);
        },
    };
}
