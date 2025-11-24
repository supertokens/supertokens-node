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
const error_1 = __importDefault(require("../../error"));
const querier_1 = require("../../querier");
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_1 = __importDefault(require("../session/recipe"));
const recipe_2 = __importDefault(require("../oauth2provider/recipe"));
const userRoleClaim_1 = require("./userRoleClaim");
const permissionClaim_1 = require("./permissionClaim");
const session_1 = require("../session");
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // This stub is required to implement RecipeModule
        this.handleAPIRequest = async (_, _tenantId, __, ___, ____, _____) => {
            throw new Error("Should never come here");
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(querier_1.Querier.getNewInstanceOrThrowError(recipeId))
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            if (!this.config.skipAddingRolesToAccessToken) {
                recipe_1.default.getInstanceOrThrowError().addClaimFromOtherRecipe(userRoleClaim_1.UserRoleClaim);
            }
            if (!this.config.skipAddingPermissionsToAccessToken) {
                recipe_1.default.getInstanceOrThrowError().addClaimFromOtherRecipe(permissionClaim_1.PermissionClaim);
            }
            const tokenPayloadBuilder = async (user, scopes, sessionHandle, userContext) => {
                let payload = {};
                const sessionInfo = await (0, session_1.getSessionInformation)(sessionHandle, userContext);
                let userRoles = [];
                if (scopes.includes("roles") || scopes.includes("permissions")) {
                    const res = await this.recipeInterfaceImpl.getRolesForUser({
                        userId: user.id,
                        tenantId: sessionInfo.tenantId,
                        userContext,
                    });
                    if (res.status !== "OK") {
                        throw new Error("Failed to fetch roles for the user");
                    }
                    userRoles = res.roles;
                }
                if (scopes.includes("roles")) {
                    payload.roles = userRoles;
                }
                if (scopes.includes("permissions")) {
                    const userPermissions = new Set();
                    for (const role of userRoles) {
                        const rolePermissions = await this.recipeInterfaceImpl.getPermissionsForRole({
                            role,
                            userContext,
                        });
                        if (rolePermissions.status !== "OK") {
                            throw new Error("Failed to fetch permissions for the role");
                        }
                        for (const perm of rolePermissions.permissions) {
                            userPermissions.add(perm);
                        }
                    }
                    payload.permissions = Array.from(userPermissions);
                }
                return payload;
            };
            recipe_2.default.getInstanceOrThrowError().addAccessTokenBuilderFromOtherRecipe(tokenPayloadBuilder);
            recipe_2.default.getInstanceOrThrowError().addIdTokenBuilderFromOtherRecipe(tokenPayloadBuilder);
            recipe_2.default
                .getInstanceOrThrowError()
                .addUserInfoBuilderFromOtherRecipe(async (user, _accessTokenPayload, scopes, tenantId, userContext) => {
                    let userInfo = {};
                    let userRoles = [];
                    if (scopes.includes("roles") || scopes.includes("permissions")) {
                        const res = await this.recipeInterfaceImpl.getRolesForUser({
                            userId: user.id,
                            tenantId,
                            userContext,
                        });
                        if (res.status !== "OK") {
                            throw new Error("Failed to fetch roles for the user");
                        }
                        userRoles = res.roles;
                    }
                    if (scopes.includes("roles")) {
                        userInfo.roles = userRoles;
                    }
                    if (scopes.includes("permissions")) {
                        const userPermissions = new Set();
                        for (const role of userRoles) {
                            const rolePermissions = await this.recipeInterfaceImpl.getPermissionsForRole({
                                role,
                                userContext,
                            });
                            if (rolePermissions.status !== "OK") {
                                throw new Error("Failed to fetch permissions for the role");
                            }
                            for (const perm of rolePermissions.permissions) {
                                userPermissions.add(perm);
                            }
                        }
                        userInfo.permissions = Array.from(userPermissions);
                    }
                    return userInfo;
                });
        });
    }
    /* Init functions */
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error(
            "Initialisation not done. Did you forget to call the UserRoles.init or SuperTokens.init functions?"
        );
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
                throw new Error("UserRoles recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
    /* RecipeModule functions */
    getAPIsHandled() {
        return [];
    }
    handleError(error, _, __) {
        throw error;
    }
    getAllCORSHeaders() {
        return [];
    }
    isErrorFromThisRecipe(err) {
        return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
Recipe.RECIPE_ID = "userroles";
Recipe.instance = undefined;
exports.default = Recipe;
