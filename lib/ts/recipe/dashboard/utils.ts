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

import { BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { HTTPMethod, NormalisedAppinfo } from "../../types";
import { sendNon200ResponseWithMessage } from "../../utils";
import {
    DASHBOARD_API,
    USERS_COUNT_API,
    USERS_LIST_GET_API,
    USER_API,
    USER_EMAIL_VERIFY_API,
    VALIDATE_KEY_API,
} from "./constants";
import { APIInterface, RecipeIdForUser, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";

export function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput {
    if (config.apiKey.trim().length === 0) {
        throw new Error("apiKey provided to Dashboard recipe cannot be empty");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        apiKey: config.apiKey,
        override,
    };
}

export function isApiPath(path: NormalisedURLPath, appInfo: NormalisedAppinfo): boolean {
    const dashboardRecipeBasePath = appInfo.apiBasePath.appendPath(new NormalisedURLPath(DASHBOARD_API));
    if (!path.startsWith(dashboardRecipeBasePath)) {
        return false;
    }

    let pathWithoutDashboardPath = path.getAsStringDangerous().split(DASHBOARD_API)[1];

    if (pathWithoutDashboardPath.charAt(0) === "/") {
        pathWithoutDashboardPath = pathWithoutDashboardPath.substring(1, pathWithoutDashboardPath.length);
    }

    if (pathWithoutDashboardPath.split("/")[0] === "api") {
        return true;
    }

    return false;
}

export function getApiIdIfMatched(path: NormalisedURLPath, method: HTTPMethod): string | undefined {
    if (path.getAsStringDangerous().endsWith(VALIDATE_KEY_API) && method === "post") {
        return VALIDATE_KEY_API;
    }

    if (path.getAsStringDangerous().endsWith(USERS_LIST_GET_API) && method === "get") {
        return USERS_LIST_GET_API;
    }

    if (path.getAsStringDangerous().endsWith(USERS_COUNT_API) && method === "get") {
        return USERS_COUNT_API;
    }

    if (path.getAsStringDangerous().endsWith(USER_API) && method === "get") {
        return USER_API;
    }
    if (path.getAsStringDangerous().endsWith(USER_EMAIL_VERIFY_API) && method === "get") {
        return USER_EMAIL_VERIFY_API;
    }

    return undefined;
}

export function sendUnauthorisedAccess(res: BaseResponse) {
    sendNon200ResponseWithMessage(res, "Unauthorised access", 401);
}

export function isValidRecipeId(recipeId: string): recipeId is RecipeIdForUser {
    return recipeId === "emailpassword" || recipeId === "thirdparty" || recipeId === "passwordless";
}
