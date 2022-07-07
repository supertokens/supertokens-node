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
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = require("../../normalisedURLPath");
const constants_1 = require("./constants");
function validateAndNormaliseUserInput(config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    return {
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function isApiPath(path, appInfo) {
    const dashboardBundlePath = appInfo.apiBasePath.appendPath(
        new normalisedURLPath_1.default(constants_1.DASHBOARD_API)
    );
    if (!path.startsWith(dashboardBundlePath)) {
        return false;
    }
    let pathWithoutDashboardPath = path.getAsStringDangerous().split(constants_1.DASHBOARD_API)[1];
    if (pathWithoutDashboardPath.charAt(0) === "/") {
        pathWithoutDashboardPath = pathWithoutDashboardPath.substring(1, pathWithoutDashboardPath.length);
    }
    if (pathWithoutDashboardPath.split("/")[0] === "api") {
        return true;
    }
    return false;
}
exports.isApiPath = isApiPath;
