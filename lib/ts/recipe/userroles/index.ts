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

import { getUserContext } from "../../utils";
import { PermissionClaim } from "./permissionClaim";
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
import { UserRoleClaim } from "./userRoleClaim";

export default class Wrapper {
    static init = Recipe.init;
    static PermissionClaim = PermissionClaim;
    static UserRoleClaim = UserRoleClaim;

    static async addRoleToUser(tenantId: string, userId: string, role: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.addRoleToUser({
            userId,
            role,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async removeUserRole(tenantId: string, userId: string, role: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeUserRole({
            userId,
            role,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async getRolesForUser(tenantId: string, userId: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRolesForUser({
            userId,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async getUsersThatHaveRole(tenantId: string, role: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersThatHaveRole({
            role,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async createNewRoleOrAddPermissions(role: string, permissions: string[], userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewRoleOrAddPermissions({
            role,
            permissions,
            userContext: getUserContext(userContext),
        });
    }

    static async getPermissionsForRole(role: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getPermissionsForRole({
            role,
            userContext: getUserContext(userContext),
        });
    }

    static async removePermissionsFromRole(role: string, permissions: string[], userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removePermissionsFromRole({
            role,
            permissions,
            userContext: getUserContext(userContext),
        });
    }

    static async getRolesThatHavePermission(permission: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRolesThatHavePermission({
            permission,
            userContext: getUserContext(userContext),
        });
    }

    static async deleteRole(role: string, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.deleteRole({
            role,
            userContext: getUserContext(userContext),
        });
    }

    static async getAllRoles(userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllRoles({
            userContext: getUserContext(userContext),
        });
    }
}

export const init = Wrapper.init;
export const addRoleToUser = Wrapper.addRoleToUser;
export const removeUserRole = Wrapper.removeUserRole;
export const getRolesForUser = Wrapper.getRolesForUser;
export const getUsersThatHaveRole = Wrapper.getUsersThatHaveRole;
export const createNewRoleOrAddPermissions = Wrapper.createNewRoleOrAddPermissions;
export const getPermissionsForRole = Wrapper.getPermissionsForRole;
export const removePermissionsFromRole = Wrapper.removePermissionsFromRole;
export const getRolesThatHavePermission = Wrapper.getRolesThatHavePermission;
export const deleteRole = Wrapper.deleteRole;
export const getAllRoles = Wrapper.getAllRoles;
export { UserRoleClaim } from "./userRoleClaim";
export { PermissionClaim } from "./permissionClaim";

export type { RecipeInterface };
