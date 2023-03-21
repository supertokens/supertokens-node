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
const supertokens_1 = __importDefault(require("../../../supertokens"));
const querier_1 = require("../../../querier");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const version_1 = require("../../../version");
function analyticsPost(_, options) {
    return __awaiter(this, void 0, void 0, function* () {
        // If telemetry is disabled, dont send any event
        if (!supertokens_1.default.getInstanceOrThrowError().telemetryEnabled) {
            return {
                status: "OK",
            };
        }
        let telemetryId;
        try {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(options.recipeId);
            let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/telemetry"), {});
            if (response.exists) {
                telemetryId = response.telemetryId;
            }
        } catch (_) {
            // Ignored
        }
        let numberOfUsers;
        try {
            numberOfUsers = yield supertokens_1.default.getInstanceOrThrowError().getUserCount();
        } catch (_) {
            // ignored
        }
        const { apiDomain, apiBasePath, websiteDomain, websiteBasePath, appName } = options.appInfo;
        return {
            status: "OK",
            data: {
                websiteDomain: websiteDomain.getAsStringDangerous(),
                websiteBasePath: websiteBasePath.getAsStringDangerous(),
                apiDomain: apiDomain.getAsStringDangerous(),
                apiBasePath: apiBasePath.getAsStringDangerous(),
                appName,
                backendSDKName: "supertokens-node",
                backendSDKVersion: version_1.version,
                telemetryId,
                numberOfUsers,
            },
        };
    });
}
exports.default = analyticsPost;
