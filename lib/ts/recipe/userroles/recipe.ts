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

import SuperTokensError from "../../error";
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";

import RecipeImplementation from "./recipeImplementation";
import { RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import SessionRecipe from "../session/recipe";
import OAuth2Recipe from "../oauth2provider/recipe";
import { UserRoleClaim } from "./userRoleClaim";
import { PermissionClaim } from "./permissionClaim";
import { User } from "../../user";
import { getSessionInformation } from "../session";
import { isTestEnv } from "../../utils";
import { applyPlugins } from "../../plugins";

export default class Recipe extends RecipeModule {
    static RECIPE_ID = "userroles" as const;
    private static instance: Recipe | undefined = undefined;

    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            if (!this.config.skipAddingRolesToAccessToken) {
                SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(UserRoleClaim);
            }
            if (!this.config.skipAddingPermissionsToAccessToken) {
                SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(PermissionClaim);
            }

            const tokenPayloadBuilder = async (
                user: User,
                scopes: string[],
                sessionHandle: string,
                userContext: UserContext
            ) => {
                let payload: {
                    roles?: string[];
                    permissions?: string[];
                } = {};

                const sessionInfo = await getSessionInformation(sessionHandle, userContext);

                let userRoles: string[] = [];

                if (scopes.includes("roles") || scopes.includes("permissions")) {
                    const res = await this.recipeInterfaceImpl.getRolesForUser({
                        userId: user.id,
                        tenantId: sessionInfo!.tenantId,
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
                    const userPermissions = new Set<string>();
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

            OAuth2Recipe.getInstanceOrThrowError().addAccessTokenBuilderFromOtherRecipe(tokenPayloadBuilder);
            OAuth2Recipe.getInstanceOrThrowError().addIdTokenBuilderFromOtherRecipe(tokenPayloadBuilder);

            OAuth2Recipe.getInstanceOrThrowError().addUserInfoBuilderFromOtherRecipe(
                async (user, _accessTokenPayload, scopes, tenantId, userContext) => {
                    let userInfo: {
                        roles?: string[];
                        permissions?: string[];
                    } = {};

                    let userRoles: string[] = [];

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
                        const userPermissions = new Set<string>();
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
                }
            );
        });
    }

    /* Init functions */

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error(
            "Initialisation not done. Did you forget to call the UserRoles.init or SuperTokens.init functions?"
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    applyPlugins(Recipe.RECIPE_ID, config as any, plugins ?? [])
                );
                return Recipe.instance;
            } else {
                throw new Error("UserRoles recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (!isTestEnv()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    /* RecipeModule functions */

    getAPIsHandled(): APIHandled[] {
        return [];
    }

    // This stub is required to implement RecipeModule
    handleAPIRequest = async (
        _: string,
        _tenantId: string | undefined,
        __: BaseRequest,
        ___: BaseResponse,
        ____: normalisedURLPath,
        _____: HTTPMethod
    ): Promise<boolean> => {
        throw new Error("Should never come here");
    };

    handleError(error: error, _: BaseRequest, __: BaseResponse): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
