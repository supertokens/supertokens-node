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
exports.default = analyticsPost;
const supertokens_1 = __importDefault(require("../../../supertokens"));
const querier_1 = require("../../../querier");
const version_1 = require("../../../version");
const error_1 = __importDefault(require("../../../error"));
const utils_1 = require("../../../utils");
async function analyticsPost(_, ___, options, userContext) {
    // If telemetry is disabled, dont send any event
    if (!supertokens_1.default.getInstanceOrThrowError().telemetryEnabled) {
        return {
            status: "OK",
        };
    }
    const { email, dashboardVersion } = await options.req.getJSONBody();
    if (email === undefined) {
        throw new error_1.default({
            message: "Missing required property 'email'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (dashboardVersion === undefined) {
        throw new error_1.default({
            message: "Missing required property 'dashboardVersion'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let telemetryId;
    let numberOfUsers;
    try {
        let querier = querier_1.Querier.getNewInstanceOrThrowError(options.recipeId);
        let response = await querier.sendGetRequest("/telemetry", {}, userContext);
        if (response.exists) {
            telemetryId = response.telemetryId;
        }
        numberOfUsers = await supertokens_1.default
            .getInstanceOrThrowError()
            .getUserCount(undefined, undefined, userContext);
    } catch (_) {
        // If either telemetry id API or user count fetch fails, no event should be sent
        return {
            status: "OK",
        };
    }
    const { apiDomain, getOrigin: websiteDomain, appName } = options.appInfo;
    const data = {
        websiteDomain: websiteDomain({
            request: undefined,
            userContext,
        }).getAsStringDangerous(),
        apiDomain: apiDomain.getAsStringDangerous(),
        appName,
        sdk: "node",
        sdkVersion: version_1.version,
        telemetryId,
        numberOfUsers,
        email,
        dashboardVersion,
    };
    try {
        await (0, utils_1.doFetch)("https://api.supertokens.com/0/st/telemetry", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "api-version": "3",
                "content-type": "application/json; charset=utf-8",
            },
        });
    } catch (e) {
        // Ignored
    }
    return {
        status: "OK",
    };
}
