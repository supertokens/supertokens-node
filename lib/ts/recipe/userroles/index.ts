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

import { PermissionClaim } from "./permissionClaim";
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
import { UserRoleClaim } from "./userRoleClaim";

export default class Wrapper {
    static init = Recipe.init;
    static PermissionClaim = PermissionClaim;
    static UserRoleClaim = UserRoleClaim;

    static async addRoleToUser(userId: string, role: string, tenantId?: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.addRoleToUser({
            userId,
            role,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async removeUserRole(userId: string, role: string, tenantId?: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeUserRole({
            userId,
            role,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getRolesForUser(userId: string, tenantId?: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRolesForUser({
            userId,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getUsersThatHaveRole(role: string, tenantId?: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersThatHaveRole({
            role,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async createNewRoleOrAddPermissions(role: string, permissions: string[], userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewRoleOrAddPermissions({
            role,
            permissions,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getPermissionsForRole(role: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getPermissionsForRole({
            role,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async removePermissionsFromRole(role: string, permissions: string[], userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removePermissionsFromRole({
            role,
            permissions,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getRolesThatHavePermission(permission: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRolesThatHavePermission({
            permission,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async deleteRole(role: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.deleteRole({
            role,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getAllRoles(userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllRoles({
            userContext: userContext === undefined ? {} : userContext,
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
