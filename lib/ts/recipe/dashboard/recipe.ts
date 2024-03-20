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

import OverrideableBuilder from "supertokens-js-override";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { APIFunction, APIInterface, APIOptions, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { getApiPathWithDashboardBase, validateAndNormaliseUserInput } from "./utils";
import {
    DASHBOARD_ANALYTICS_API,
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
    UNLINK_USER,
    USERROLES_LIST_API,
    USERROLES_ROLE_API,
    USERROLES_REMOVE_PERMISSIONS_API,
    USERROLES_PERMISSIONS_API,
    USERROLES_USER_API,
    CREATE_EMAIL_PASSWORD_USER,
    CREATE_PASSWORDLESS_USER,
    LIST_TENANT_LOGIN_METHODS,
} from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import dashboard from "./api/dashboard";
import error from "../../error";
import validateKey from "./api/validateKey";
import apiKeyProtector from "./api/apiKeyProtector";
import usersGet from "./api/usersGet";
import usersCountGet from "./api/usersCountGet";
import { userGet } from "./api/userdetails/userGet";
import { userEmailVerifyGet } from "./api/userdetails/userEmailVerifyGet";
import { userMetaDataGet } from "./api/userdetails/userMetadataGet";
import { userSessionsGet } from "./api/userdetails/userSessionsGet";
import { userDelete } from "./api/userdetails/userDelete";
import { userEmailVerifyPut } from "./api/userdetails/userEmailVerifyPut";
import { userMetadataPut } from "./api/userdetails/userMetadataPut";
import { userPasswordPut } from "./api/userdetails/userPasswordPut";
import { userPut } from "./api/userdetails/userPut";
import { userEmailVerifyTokenPost } from "./api/userdetails/userEmailVerifyTokenPost";
import { userSessionsPost } from "./api/userdetails/userSessionsPost";
import signIn from "./api/signIn";
import signOut from "./api/signOut";
import { getSearchTags } from "./api/search/tagsGet";
import analyticsPost from "./api/analytics";
import { userUnlink } from "./api/userdetails/userUnlinkGet";
import getAllRoles from "./api/userroles/roles/getAllRoles";
import deleteRole from "./api/userroles/roles/deleteRole";
import removePermissionsFromRole from "./api/userroles/permissions/removePermissions";
import getPermissionsForRole from "./api/userroles/permissions/getPermissionsForRole";
import addRoleToUser from "./api/userroles/addRoleToUser";
import getRolesForUser from "./api/userroles/getRolesForUser";
import removeUserRole from "./api/userroles/removeUserRole";
import createRoleOrAddPermissions from "./api/userroles/roles/createRoleOrAddPermissions";
import { createEmailPasswordUser } from "./api/user/create/emailpasswordUser";
import { createPasswordlessUser } from "./api/user/create/passwordlessUser";
import getTenantLoginMethodsInfo from "./api/getTenantLoginMethodsInfo";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "dashboard";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);

        this.config = validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation());
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Dashboard.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("Dashboard recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                id: DASHBOARD_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase("/")),
                disabled: false,
                method: "get",
            },
            {
                id: DASHBOARD_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase("/roles")),
                disabled: false,
                method: "get",
            },
            {
                id: SIGN_IN_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(SIGN_IN_API)),
                disabled: false,
                method: "post",
            },
            {
                id: VALIDATE_KEY_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(VALIDATE_KEY_API)),
                disabled: false,
                method: "post",
            },
            {
                id: SIGN_OUT_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(SIGN_OUT_API)),
                disabled: false,
                method: "post",
            },
            {
                id: USERS_LIST_GET_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERS_LIST_GET_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USERS_COUNT_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERS_COUNT_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_API)),
                disabled: false,
                method: "post",
            },
            {
                id: USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_API)),
                disabled: false,
                method: "delete",
            },
            {
                id: USER_EMAIL_VERIFY_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_EMAIL_VERIFY_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USER_EMAIL_VERIFY_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_EMAIL_VERIFY_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USER_METADATA_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_METADATA_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USER_METADATA_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_METADATA_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USER_SESSIONS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_SESSIONS_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USER_SESSIONS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_SESSIONS_API)),
                disabled: false,
                method: "post",
            },
            {
                id: USER_PASSWORD_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_PASSWORD_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USER_EMAIL_VERIFY_TOKEN_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USER_EMAIL_VERIFY_TOKEN_API)),
                disabled: false,
                method: "post",
            },
            {
                id: SEARCH_TAGS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(SEARCH_TAGS_API)),
                disabled: false,
                method: "get",
            },
            {
                id: DASHBOARD_ANALYTICS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(DASHBOARD_ANALYTICS_API)),
                disabled: false,
                method: "post",
            },
            {
                id: UNLINK_USER,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(UNLINK_USER)),
                disabled: false,
                method: "get",
            },
            {
                id: USERROLES_LIST_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_LIST_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USERROLES_ROLE_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_ROLE_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USERROLES_ROLE_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_ROLE_API)),
                disabled: false,
                method: "delete",
            },
            {
                id: USERROLES_PERMISSIONS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_PERMISSIONS_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USERROLES_PERMISSIONS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_PERMISSIONS_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USERROLES_REMOVE_PERMISSIONS_API,
                pathWithoutApiBasePath: new NormalisedURLPath(
                    getApiPathWithDashboardBase(USERROLES_REMOVE_PERMISSIONS_API)
                ),
                disabled: false,
                method: "put",
            },
            {
                id: USERROLES_USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_USER_API)),
                disabled: false,
                method: "put",
            },
            {
                id: USERROLES_USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_USER_API)),
                disabled: false,
                method: "get",
            },
            {
                id: USERROLES_USER_API,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(USERROLES_USER_API)),
                disabled: false,
                method: "delete",
            },
            {
                id: CREATE_EMAIL_PASSWORD_USER,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(CREATE_EMAIL_PASSWORD_USER)),
                disabled: false,
                method: "post",
            },
            {
                id: CREATE_PASSWORDLESS_USER,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(CREATE_PASSWORDLESS_USER)),
                disabled: false,
                method: "post",
            },
            {
                id: LIST_TENANT_LOGIN_METHODS,
                pathWithoutApiBasePath: new NormalisedURLPath(getApiPathWithDashboardBase(LIST_TENANT_LOGIN_METHODS)),
                disabled: false,
                method: "get",
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        __: NormalisedURLPath,
        ___: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options: APIOptions = {
            config: this.config,
            recipeId: this.getRecipeId(),
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
            isInServerlessEnv: this.isInServerlessEnv,
            appInfo: this.getAppInfo(),
        };

        // For these APIs we dont need API key validation
        if (id === DASHBOARD_API) {
            return await dashboard(this.apiImpl, options, userContext);
        }

        if (id === SIGN_IN_API) {
            return await signIn(this.apiImpl, options, userContext);
        }

        if (id === VALIDATE_KEY_API) {
            return await validateKey(this.apiImpl, options, userContext);
        }

        // Do API key validation for the remaining APIs
        let apiFunction: APIFunction | undefined;

        if (id === USERS_LIST_GET_API) {
            apiFunction = usersGet;
        } else if (id === USERS_COUNT_API) {
            apiFunction = usersCountGet;
        } else if (id === USER_API) {
            if (req.getMethod() === "get") {
                apiFunction = userGet;
            }

            if (req.getMethod() === "delete") {
                apiFunction = userDelete;
            }

            if (req.getMethod() === "put") {
                apiFunction = userPut;
            }
        } else if (id === USER_EMAIL_VERIFY_API) {
            if (req.getMethod() === "get") {
                apiFunction = userEmailVerifyGet;
            }

            if (req.getMethod() === "put") {
                apiFunction = userEmailVerifyPut;
            }
        } else if (id === USER_METADATA_API) {
            if (req.getMethod() === "get") {
                apiFunction = userMetaDataGet;
            }

            if (req.getMethod() === "put") {
                apiFunction = userMetadataPut;
            }
        } else if (id === USER_SESSIONS_API) {
            if (req.getMethod() === "get") {
                apiFunction = userSessionsGet;
            }

            if (req.getMethod() === "post") {
                apiFunction = userSessionsPost;
            }
        } else if (id === USER_PASSWORD_API) {
            apiFunction = userPasswordPut;
        } else if (id === USER_EMAIL_VERIFY_TOKEN_API) {
            apiFunction = userEmailVerifyTokenPost;
        } else if (id === SEARCH_TAGS_API) {
            apiFunction = getSearchTags;
        } else if (id === SIGN_OUT_API) {
            apiFunction = signOut;
        } else if (id === DASHBOARD_ANALYTICS_API && req.getMethod() === "post") {
            apiFunction = analyticsPost;
        } else if (id === UNLINK_USER) {
            apiFunction = userUnlink;
        } else if (id === USERROLES_LIST_API) {
            apiFunction = getAllRoles;
        } else if (id === USERROLES_ROLE_API) {
            if (req.getMethod() === "put") {
                apiFunction = createRoleOrAddPermissions;
            }
            if (req.getMethod() === "delete") {
                apiFunction = deleteRole;
            }
        } else if (id === USERROLES_PERMISSIONS_API) {
            if (req.getMethod() === "get") {
                apiFunction = getPermissionsForRole;
            }
        } else if (id === USERROLES_REMOVE_PERMISSIONS_API) {
            apiFunction = removePermissionsFromRole;
        } else if (id === USERROLES_USER_API) {
            if (req.getMethod() === "put") {
                apiFunction = addRoleToUser;
            }
            if (req.getMethod() === "get") {
                apiFunction = getRolesForUser;
            }
            if (req.getMethod() === "delete") {
                apiFunction = removeUserRole;
            }
        } else if (id === CREATE_EMAIL_PASSWORD_USER) {
            if (req.getMethod() === "post") {
                apiFunction = createEmailPasswordUser;
            }
        } else if (id === CREATE_PASSWORDLESS_USER) {
            if (req.getMethod() === "post") {
                apiFunction = createPasswordlessUser;
            }
        } else if (id === LIST_TENANT_LOGIN_METHODS) {
            if (req.getMethod() === "get") {
                apiFunction = getTenantLoginMethodsInfo;
            }
        }

        // If the id doesnt match any APIs return false
        if (apiFunction === undefined) {
            return false;
        }

        return await apiKeyProtector(this.apiImpl, tenantId, options, apiFunction, userContext);
    };

    handleError = async (err: error, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is error => {
        return error.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
