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

import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { HTTPMethod, NormalisedAppinfo } from "../../types";
import { sendNon200ResponseWithMessage } from "../../utils";
import {
    DASHBOARD_API,
    SEARCH_TAGS_API,
    SIGN_IN_API,
    SIGN_OUT_API,
    USERS_COUNT_API,
    USERS_LIST_GET_API,
    USER_API,
    USER_EMAIL_VERIFY_API,
    USER_EMAIL_VERIFY_TOKEN_API,
    USER_METADATA_API,
    USER_PASSWORD_API,
    USER_SESSIONS_API,
    VALIDATE_KEY_API,
    DASHBOARD_ANALYTICS_API,
} from "./constants";
import {
    APIInterface,
    RecipeIdForUser,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
    RecipeLevelUser,
    RecipeLevelUserWithFirstAndLastName,
} from "./types";
import AccountLinking from "../accountlinking/recipe";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import PasswordlessRecipe from "../passwordless/recipe";
import ThirdPartyEmailPasswordRecipe from "../thirdpartyemailpassword/recipe";
import ThirdPartyPasswordlessRecipe from "../thirdpartypasswordless/recipe";
import RecipeUserId from "../../recipeUserId";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...(config === undefined ? {} : config.override),
    };

    return {
        ...config,
        override,
        authMode: config !== undefined && config.apiKey ? "api-key" : "email-password",
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

    if (path.getAsStringDangerous().endsWith(SIGN_IN_API) && method === "post") {
        return SIGN_IN_API;
    }

    if (path.getAsStringDangerous().endsWith(SIGN_OUT_API) && method === "post") {
        return SIGN_OUT_API;
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

    if (path.getAsStringDangerous().endsWith(USER_SESSIONS_API)) {
        if (method === "get" || method === "post") {
            return USER_SESSIONS_API;
        }
    }

    if (path.getAsStringDangerous().endsWith(USER_PASSWORD_API) && method === "put") {
        return USER_PASSWORD_API;
    }

    if (path.getAsStringDangerous().endsWith(USER_EMAIL_VERIFY_TOKEN_API) && method === "post") {
        return USER_EMAIL_VERIFY_TOKEN_API;
    }

    if (path.getAsStringDangerous().endsWith(USER_PASSWORD_API) && method === "put") {
        return USER_PASSWORD_API;
    }
    if (path.getAsStringDangerous().endsWith(SEARCH_TAGS_API) && method === "get") {
        return SEARCH_TAGS_API;
    }

    if (path.getAsStringDangerous().endsWith(DASHBOARD_ANALYTICS_API) && method === "post") {
        return DASHBOARD_ANALYTICS_API;
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
    recipeUserId: RecipeUserId,
    recipeId: string
): Promise<{
    user: RecipeLevelUserWithFirstAndLastName | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}> {
    let userResponse = await _getUserForRecipeId(recipeUserId, recipeId);
    let user: RecipeLevelUserWithFirstAndLastName | undefined = undefined;
    if (userResponse.user !== undefined) {
        user = {
            ...userResponse.user,
            firstName: "",
            lastName: "",
        };
    }
    return {
        user,
        recipe: userResponse.recipe,
    };
}

async function _getUserForRecipeId(
    recipeUserId: RecipeUserId,
    recipeId: string
): Promise<{
    user: RecipeLevelUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}> {
    let user: RecipeLevelUser | undefined;
    let recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;

    const globalUser = await AccountLinking.getInstance().recipeInterfaceImpl.getUser({
        userId: recipeUserId.getAsString(),
        userContext: {},
    });

    if (recipeId === EmailPasswordRecipe.RECIPE_ID) {
        try {
            // we detect if this recipe has been init or not..
            EmailPasswordRecipe.getInstanceOrThrowError();
            if (globalUser !== undefined) {
                let loginMethod = globalUser.loginMethods.find(
                    (u) => u.recipeId === "emailpassword" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                );
                if (loginMethod !== undefined) {
                    user = {
                        ...loginMethod,
                    };
                    recipe = "emailpassword";
                }
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                // we detect if this recipe has been init or not..
                ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
                if (globalUser !== undefined) {
                    let loginMethod = globalUser.loginMethods.find(
                        (u) =>
                            u.recipeId === "emailpassword" &&
                            u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethod !== undefined) {
                        user = {
                            ...loginMethod,
                        };
                        recipe = "thirdpartyemailpassword";
                    }
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === ThirdPartyRecipe.RECIPE_ID) {
        try {
            ThirdPartyRecipe.getInstanceOrThrowError();
            if (globalUser !== undefined) {
                let loginMethod = globalUser.loginMethods.find(
                    (u) => u.recipeId === "thirdparty" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                );
                if (loginMethod !== undefined) {
                    user = {
                        ...loginMethod,
                    };
                    recipe = "thirdparty";
                }
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                // we detect if this recipe has been init or not..
                ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
                if (globalUser !== undefined) {
                    let loginMethod = globalUser.loginMethods.find(
                        (u) =>
                            u.recipeId === "thirdparty" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethod !== undefined) {
                        user = {
                            ...loginMethod,
                        };
                        recipe = "thirdpartyemailpassword";
                    }
                }
            } catch (e) {
                // No - op
            }
        }

        if (user === undefined) {
            try {
                ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
                if (globalUser !== undefined) {
                    let loginMethod = globalUser.loginMethods.find(
                        (u) =>
                            u.recipeId === "thirdparty" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethod !== undefined) {
                        user = {
                            ...loginMethod,
                        };
                        recipe = "thirdpartypasswordless";
                    }
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === PasswordlessRecipe.RECIPE_ID) {
        try {
            PasswordlessRecipe.getInstanceOrThrowError();
            if (globalUser !== undefined) {
                let loginMethod = globalUser.loginMethods.find(
                    (u) => u.recipeId === "passwordless" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                );
                if (loginMethod !== undefined) {
                    user = {
                        ...loginMethod,
                    };
                    recipe = "passwordless";
                }
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
                if (globalUser !== undefined) {
                    let loginMethod = globalUser.loginMethods.find(
                        (u) =>
                            u.recipeId === "passwordless" && u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethod !== undefined) {
                        user = {
                            ...loginMethod,
                        };
                        recipe = "thirdpartypasswordless";
                    }
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

export function isRecipeInitialised(recipeId: RecipeIdForUser): boolean {
    let isRecipeInitialised = false;

    if (recipeId === "emailpassword") {
        try {
            EmailPasswordRecipe.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}

        if (!isRecipeInitialised) {
            try {
                ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "passwordless") {
        try {
            PasswordlessRecipe.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}

        if (!isRecipeInitialised) {
            try {
                ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "thirdparty") {
        try {
            ThirdPartyRecipe.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}

        if (!isRecipeInitialised) {
            try {
                ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }

        if (!isRecipeInitialised) {
            try {
                ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    }

    return isRecipeInitialised;
}

export async function validateApiKey(input: { req: BaseRequest; config: TypeNormalisedInput; userContext: any }) {
    let apiKeyHeaderValue: string | undefined = input.req.getHeaderValue("authorization");

    // We receieve the api key as `Bearer API_KEY`, this retrieves just the key
    apiKeyHeaderValue = apiKeyHeaderValue?.split(" ")[1];

    if (apiKeyHeaderValue === undefined) {
        return false;
    }

    return apiKeyHeaderValue === input.config.apiKey;
}

export function getApiPathWithDashboardBase(path: string): string {
    return DASHBOARD_API + path;
}
