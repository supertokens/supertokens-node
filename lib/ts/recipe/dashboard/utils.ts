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
    USER_METADATA_API,
    USER_PASSWORD_API,
    USER_SESSIONS_API,
    VALIDATE_KEY_API,
} from "./constants";
import {
    APIInterface,
    EmailPasswordUser,
    PasswordlessUser,
    RecipeIdForUser,
    RecipeInterface,
    ThirdPartyUser,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import PasswordlessRecipe from "../passwordless/recipe";
import EmailPassword from "../emailpassword";
import ThirdParty from "../thirdparty";
import Passwordless from "../passwordless";
import ThirdPartyEmailPassword from "../thirdpartyemailpassword";
import ThirdPartyPasswordless from "../thirdpartypasswordless";

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

    if (path.getAsStringDangerous().endsWith(USER_API)) {
        if (method === "get" || method === "delete" || method === "put") {
            return USER_API;
        }
    }

    if (path.getAsStringDangerous().endsWith(USER_EMAIL_VERIFY_API)) {
        if (method === "get" || method === "put") {
            return USER_EMAIL_VERIFY_API;
        }
    }

    if (path.getAsStringDangerous().endsWith(USER_METADATA_API)) {
        if (method === "get" || method === "put") {
            return USER_METADATA_API;
        }
    }

    if (path.getAsStringDangerous().endsWith(USER_SESSIONS_API) && method === "get") {
        return USER_SESSIONS_API;
    }

    if (path.getAsStringDangerous().endsWith(USER_PASSWORD_API) && method === "put") {
        return USER_PASSWORD_API;
    }

    return undefined;
}

export function sendUnauthorisedAccess(res: BaseResponse) {
    sendNon200ResponseWithMessage(res, "Unauthorised access", 401);
}

export function isValidRecipeId(recipeId: string): recipeId is RecipeIdForUser {
    return recipeId === "emailpassword" || recipeId === "thirdparty" || recipeId === "passwordless";
}

export async function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}> {
    let user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
    let recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;

    if (recipeId === EmailPasswordRecipe.RECIPE_ID) {
        try {
            const userResponse = await EmailPassword.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "emailpassword";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === ThirdPartyRecipe.RECIPE_ID) {
        try {
            const userResponse = await ThirdParty.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "thirdparty";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === PasswordlessRecipe.RECIPE_ID) {
        try {
            const userResponse = await Passwordless.getUserById({
                userId,
            });

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "passwordless";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    }

    return {
        user,
        recipe,
    };
}
