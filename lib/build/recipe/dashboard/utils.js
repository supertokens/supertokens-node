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
const utils_1 = require("../../utils");
const constants_1 = require("./constants");
function validateAndNormaliseUserInput(config) {
    if (config.apiKey.trim().length === 0) {
        throw new Error("apiKey provided to Dashboard recipe cannot be empty");
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    return {
        apiKey: config.apiKey,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function isApiPath(path, appInfo) {
    const dashboardRecipeBasePath = appInfo.apiBasePath.appendPath(
        new normalisedURLPath_1.default(constants_1.DASHBOARD_API)
    );
    if (!path.startsWith(dashboardRecipeBasePath)) {
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
function getApiIdIfMatched(path, method) {
    if (path.getAsStringDangerous().endsWith(constants_1.VALIDATE_KEY_API) && method === "post") {
        return constants_1.VALIDATE_KEY_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USERS_LIST_GET_API) && method === "get") {
        return constants_1.USERS_LIST_GET_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USERS_COUNT_API) && method === "get") {
        return constants_1.USERS_COUNT_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_API) && method === "get") {
        return constants_1.USER_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_EMAIL_VERIFY_API) && method === "get") {
        return constants_1.USER_EMAIL_VERIFY_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_METADATA_API) && method === "get") {
        return constants_1.USER_METADATA_API;
    }
    return undefined;
}
exports.getApiIdIfMatched = getApiIdIfMatched;
function sendUnauthorisedAccess(res) {
    utils_1.sendNon200ResponseWithMessage(res, "Unauthorised access", 401);
}
exports.sendUnauthorisedAccess = sendUnauthorisedAccess;
function isValidRecipeId(recipeId) {
    return recipeId === "emailpassword" || recipeId === "thirdparty" || recipeId === "passwordless";
}
exports.isValidRecipeId = isValidRecipeId;
