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
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const dashboard_1 = __importDefault(require("./api/dashboard"));
const error_1 = __importDefault(require("../../error"));
const validateKey_1 = __importDefault(require("./api/validateKey"));
const apiKeyProtector_1 = __importDefault(require("./api/apiKeyProtector"));
const usersGet_1 = __importDefault(require("./api/usersGet"));
const usersCountGet_1 = __importDefault(require("./api/usersCountGet"));
const userGet_1 = require("./api/userdetails/userGet");
const userEmailVerifyGet_1 = require("./api/userdetails/userEmailVerifyGet");
const userMetadataGet_1 = require("./api/userdetails/userMetadataGet");
const userSessionsGet_1 = require("./api/userdetails/userSessionsGet");
const userDelete_1 = require("./api/userdetails/userDelete");
const userEmailVerifyPut_1 = require("./api/userdetails/userEmailVerifyPut");
const userMetadataPut_1 = require("./api/userdetails/userMetadataPut");
const userPasswordPut_1 = require("./api/userdetails/userPasswordPut");
const userPut_1 = require("./api/userdetails/userPut");
const userEmailVerifyTokenPost_1 = require("./api/userdetails/userEmailVerifyTokenPost");
const userSessionsPost_1 = require("./api/userdetails/userSessionsPost");
const signIn_1 = __importDefault(require("./api/signIn"));
const signOut_1 = __importDefault(require("./api/signOut"));
const tagsGet_1 = require("./api/search/tagsGet");
const analytics_1 = __importDefault(require("./api/analytics"));
const userUnlinkGet_1 = require("./api/userdetails/userUnlinkGet");
const getAllRoles_1 = __importDefault(require("./api/userroles/roles/getAllRoles"));
const deleteRole_1 = __importDefault(require("./api/userroles/roles/deleteRole"));
const removePermissions_1 = __importDefault(require("./api/userroles/permissions/removePermissions"));
const getPermissionsForRole_1 = __importDefault(require("./api/userroles/permissions/getPermissionsForRole"));
const addRoleToUser_1 = __importDefault(require("./api/userroles/addRoleToUser"));
const getRolesForUser_1 = __importDefault(require("./api/userroles/getRolesForUser"));
const removeUserRole_1 = __importDefault(require("./api/userroles/removeUserRole"));
const createRoleOrAddPermissions_1 = __importDefault(require("./api/userroles/roles/createRoleOrAddPermissions"));
const emailpasswordUser_1 = require("./api/user/create/emailpasswordUser");
const passwordlessUser_1 = require("./api/user/create/passwordlessUser");
const listAllTenantsWithLoginMethods_1 = __importDefault(require("./api/multitenancy/listAllTenantsWithLoginMethods"));
const getTenantInfo_1 = __importDefault(require("./api/multitenancy/getTenantInfo"));
const deleteTenant_1 = __importDefault(require("./api/multitenancy/deleteTenant"));
const createTenant_1 = __importDefault(require("./api/multitenancy/createTenant"));
const deleteThirdPartyConfig_1 = __importDefault(require("./api/multitenancy/deleteThirdPartyConfig"));
const createOrUpdateThirdPartyConfig_1 = __importDefault(require("./api/multitenancy/createOrUpdateThirdPartyConfig"));
const updateTenantFirstFactor_1 = __importDefault(require("./api/multitenancy/updateTenantFirstFactor"));
const updateTenantSecondaryFactor_1 = __importDefault(require("./api/multitenancy/updateTenantSecondaryFactor"));
const updateTenantCoreConfig_1 = __importDefault(require("./api/multitenancy/updateTenantCoreConfig"));
const getThirdPartyConfig_1 = __importDefault(require("./api/multitenancy/getThirdPartyConfig"));
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    id: constants_1.DASHBOARD_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)("/")
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.DASHBOARD_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)("/roles")
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.DASHBOARD_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)("/tenants")
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.SIGN_IN_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.SIGN_IN_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.VALIDATE_KEY_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.VALIDATE_KEY_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.SIGN_OUT_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.SIGN_OUT_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.USERS_LIST_GET_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERS_LIST_GET_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USERS_COUNT_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERS_COUNT_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_API)
                    ),
                    disabled: false,
                    method: "delete",
                },
                {
                    id: constants_1.USER_EMAIL_VERIFY_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_EMAIL_VERIFY_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USER_EMAIL_VERIFY_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_EMAIL_VERIFY_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USER_METADATA_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_METADATA_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USER_METADATA_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_METADATA_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USER_SESSIONS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_SESSIONS_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USER_SESSIONS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_SESSIONS_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.USER_PASSWORD_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_PASSWORD_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USER_EMAIL_VERIFY_TOKEN_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USER_EMAIL_VERIFY_TOKEN_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.SEARCH_TAGS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.SEARCH_TAGS_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.DASHBOARD_ANALYTICS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.DASHBOARD_ANALYTICS_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.UNLINK_USER,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.UNLINK_USER)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USERROLES_LIST_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_LIST_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USERROLES_ROLE_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_ROLE_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USERROLES_ROLE_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_ROLE_API)
                    ),
                    disabled: false,
                    method: "delete",
                },
                {
                    id: constants_1.USERROLES_PERMISSIONS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_PERMISSIONS_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USERROLES_PERMISSIONS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_PERMISSIONS_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USERROLES_REMOVE_PERMISSIONS_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_REMOVE_PERMISSIONS_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USERROLES_USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_USER_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.USERROLES_USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_USER_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.USERROLES_USER_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.USERROLES_USER_API)
                    ),
                    disabled: false,
                    method: "delete",
                },
                {
                    id: constants_1.CREATE_EMAIL_PASSWORD_USER,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.CREATE_EMAIL_PASSWORD_USER)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.CREATE_PASSWORDLESS_USER,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.CREATE_PASSWORDLESS_USER)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.LIST_TENANTS_WITH_LOGIN_METHODS,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.LIST_TENANTS_WITH_LOGIN_METHODS)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.TENANT_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.TENANT_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_API)
                    ),
                    disabled: false,
                    method: "delete",
                },
                {
                    id: constants_1.TENANT_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_API)
                    ),
                    disabled: false,
                    method: "post",
                },
                {
                    id: constants_1.UPDATE_TENANT_FIRST_FACTOR_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.UPDATE_TENANT_FIRST_FACTOR_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.UPDATE_TENANT_REQUIRED_SECONDARY_FACTOR_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(
                            constants_1.UPDATE_TENANT_REQUIRED_SECONDARY_FACTOR_API
                        )
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.UPDATE_TENANT_CORE_CONFIG_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.UPDATE_TENANT_CORE_CONFIG_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.TENANT_THIRD_PARTY_CONFIG_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_THIRD_PARTY_CONFIG_API)
                    ),
                    disabled: false,
                    method: "get",
                },
                {
                    id: constants_1.TENANT_THIRD_PARTY_CONFIG_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_THIRD_PARTY_CONFIG_API)
                    ),
                    disabled: false,
                    method: "put",
                },
                {
                    id: constants_1.TENANT_THIRD_PARTY_CONFIG_API,
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        (0, utils_1.getApiPathWithDashboardBase)(constants_1.TENANT_THIRD_PARTY_CONFIG_API)
                    ),
                    disabled: false,
                    method: "delete",
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, __, ___, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
                isInServerlessEnv: this.isInServerlessEnv,
                appInfo: this.getAppInfo(),
            };
            // For these APIs we dont need API key validation
            if (id === constants_1.DASHBOARD_API) {
                return await (0, dashboard_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.SIGN_IN_API) {
                return await (0, signIn_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.VALIDATE_KEY_API) {
                return await (0, validateKey_1.default)(this.apiImpl, options, userContext);
            }
            // Do API key validation for the remaining APIs
            let apiFunction;
            if (id === constants_1.USERS_LIST_GET_API) {
                apiFunction = usersGet_1.default;
            } else if (id === constants_1.USERS_COUNT_API) {
                apiFunction = usersCountGet_1.default;
            } else if (id === constants_1.USER_API) {
                if (req.getMethod() === "get") {
                    apiFunction = userGet_1.userGet;
                }
                if (req.getMethod() === "delete") {
                    apiFunction = userDelete_1.userDelete;
                }
                if (req.getMethod() === "put") {
                    apiFunction = userPut_1.userPut;
                }
            } else if (id === constants_1.USER_EMAIL_VERIFY_API) {
                if (req.getMethod() === "get") {
                    apiFunction = userEmailVerifyGet_1.userEmailVerifyGet;
                }
                if (req.getMethod() === "put") {
                    apiFunction = userEmailVerifyPut_1.userEmailVerifyPut;
                }
            } else if (id === constants_1.USER_METADATA_API) {
                if (req.getMethod() === "get") {
                    apiFunction = userMetadataGet_1.userMetaDataGet;
                }
                if (req.getMethod() === "put") {
                    apiFunction = userMetadataPut_1.userMetadataPut;
                }
            } else if (id === constants_1.USER_SESSIONS_API) {
                if (req.getMethod() === "get") {
                    apiFunction = userSessionsGet_1.userSessionsGet;
                }
                if (req.getMethod() === "post") {
                    apiFunction = userSessionsPost_1.userSessionsPost;
                }
            } else if (id === constants_1.USER_PASSWORD_API) {
                apiFunction = userPasswordPut_1.userPasswordPut;
            } else if (id === constants_1.USER_EMAIL_VERIFY_TOKEN_API) {
                apiFunction = userEmailVerifyTokenPost_1.userEmailVerifyTokenPost;
            } else if (id === constants_1.SEARCH_TAGS_API) {
                apiFunction = tagsGet_1.getSearchTags;
            } else if (id === constants_1.SIGN_OUT_API) {
                apiFunction = signOut_1.default;
            } else if (id === constants_1.DASHBOARD_ANALYTICS_API && req.getMethod() === "post") {
                apiFunction = analytics_1.default;
            } else if (id === constants_1.UNLINK_USER) {
                apiFunction = userUnlinkGet_1.userUnlink;
            } else if (id === constants_1.USERROLES_LIST_API) {
                apiFunction = getAllRoles_1.default;
            } else if (id === constants_1.USERROLES_ROLE_API) {
                if (req.getMethod() === "put") {
                    apiFunction = createRoleOrAddPermissions_1.default;
                }
                if (req.getMethod() === "delete") {
                    apiFunction = deleteRole_1.default;
                }
            } else if (id === constants_1.USERROLES_PERMISSIONS_API) {
                if (req.getMethod() === "get") {
                    apiFunction = getPermissionsForRole_1.default;
                }
            } else if (id === constants_1.USERROLES_REMOVE_PERMISSIONS_API) {
                apiFunction = removePermissions_1.default;
            } else if (id === constants_1.USERROLES_USER_API) {
                if (req.getMethod() === "put") {
                    apiFunction = addRoleToUser_1.default;
                }
                if (req.getMethod() === "get") {
                    apiFunction = getRolesForUser_1.default;
                }
                if (req.getMethod() === "delete") {
                    apiFunction = removeUserRole_1.default;
                }
            } else if (id === constants_1.CREATE_EMAIL_PASSWORD_USER) {
                if (req.getMethod() === "post") {
                    apiFunction = emailpasswordUser_1.createEmailPasswordUser;
                }
            } else if (id === constants_1.CREATE_PASSWORDLESS_USER) {
                if (req.getMethod() === "post") {
                    apiFunction = passwordlessUser_1.createPasswordlessUser;
                }
            } else if (id === constants_1.LIST_TENANTS_WITH_LOGIN_METHODS) {
                if (req.getMethod() === "get") {
                    apiFunction = listAllTenantsWithLoginMethods_1.default;
                }
            } else if (id === constants_1.TENANT_API) {
                if (req.getMethod() === "post") {
                    apiFunction = createTenant_1.default;
                }
                if (req.getMethod() === "get") {
                    apiFunction = getTenantInfo_1.default;
                }
                if (req.getMethod() === "delete") {
                    apiFunction = deleteTenant_1.default;
                }
            } else if (id === constants_1.UPDATE_TENANT_FIRST_FACTOR_API) {
                apiFunction = updateTenantFirstFactor_1.default;
            } else if (id === constants_1.UPDATE_TENANT_REQUIRED_SECONDARY_FACTOR_API) {
                apiFunction = updateTenantSecondaryFactor_1.default;
            } else if (id === constants_1.UPDATE_TENANT_CORE_CONFIG_API) {
                apiFunction = updateTenantCoreConfig_1.default;
            } else if (id === constants_1.TENANT_THIRD_PARTY_CONFIG_API) {
                if (req.getMethod() === "get") {
                    apiFunction = getThirdPartyConfig_1.default;
                }
                if (req.getMethod() === "put") {
                    apiFunction = createOrUpdateThirdPartyConfig_1.default;
                }
                if (req.getMethod() === "delete") {
                    apiFunction = deleteThirdPartyConfig_1.default;
                }
            }
            // If the id doesnt match any APIs return false
            if (apiFunction === undefined) {
                return false;
            }
            return await (0, apiKeyProtector_1.default)(this.apiImpl, tenantId, options, apiFunction, userContext);
        };
        this.handleError = async (err, _, __) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default((0, recipeImplementation_1.default)());
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Dashboard.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    (0, plugins_1.applyPlugins)(
                        Recipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    )
                );
                return Recipe.instance;
            } else {
                throw new Error("Dashboard recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "dashboard";
exports.default = Recipe;
