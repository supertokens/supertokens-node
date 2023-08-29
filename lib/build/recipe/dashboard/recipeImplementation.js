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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("./error"));
const logger_1 = require("../../logger");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const utils_1 = require("../../utils");
const version_1 = require("../../version");
const constants_1 = require("./constants");
const utils_2 = require("./utils");
function getRecipeImplementation() {
    return {
        getDashboardBundleLocation: function () {
            return __awaiter(this, void 0, void 0, function* () {
                return `https://cdn.jsdelivr.net/gh/supertokens/dashboard@v${version_1.dashboardVersion}/build/`;
            });
        },
        shouldAllowAccess: function (input) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                // For cases where we're not using the API key, the JWT is being used; we allow their access by default
                if (!input.config.apiKey) {
                    // make the check for the API endpoint here with querier
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                    const authHeaderValue =
                        (_a = input.req.getHeaderValue("authorization")) === null || _a === void 0
                            ? void 0
                            : _a.split(" ")[1];
                    const sessionVerificationResponse = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/dashboard/session/verify"),
                        {
                            sessionId: authHeaderValue,
                        }
                    );
                    if (sessionVerificationResponse.status !== "OK") {
                        return false;
                    }
                    // For all non GET requests we also want to check if the user is allowed to perform this operation
                    if (utils_1.normaliseHttpMethod(input.req.getMethod()) !== "get") {
                        // We dont want to block the analytics API
                        if (input.req.getOriginalURL().endsWith(constants_1.DASHBOARD_ANALYTICS_API)) {
                            return true;
                        }
                        // We do not want to block the sign out request
                        if (input.req.getOriginalURL().endsWith(constants_1.SIGN_OUT_API)) {
                            return true;
                        }
                        const admins = input.config.admins;
                        // If the user has provided no admins, allow
                        if (admins.length === 0) {
                            return true;
                        }
                        const emailInHeaders = input.req.getHeaderValue("email");
                        if (emailInHeaders === undefined) {
                            logger_1.logDebugMessage(
                                "User Dashboard: Returniing OPERATION_NOT_ALLOWED because no email was provided in headers"
                            );
                            return false;
                        }
                        if (!admins.includes(emailInHeaders)) {
                            logger_1.logDebugMessage(
                                "User Dashboard: Throwing OPERATION_NOT_ALLOWED because user is not an admin"
                            );
                            throw new error_1.default();
                        }
                    }
                    return true;
                }
                return yield utils_2.validateApiKey(input);
            });
        },
    };
}
exports.default = getRecipeImplementation;
