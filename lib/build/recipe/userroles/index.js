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
exports.PermissionClaim =
    exports.UserRoleClaim =
    exports.getAllRoles =
    exports.deleteRole =
    exports.getRolesThatHavePermission =
    exports.removePermissionsFromRole =
    exports.getPermissionsForRole =
    exports.createNewRoleOrAddPermissions =
    exports.getUsersThatHaveRole =
    exports.getRolesForUser =
    exports.removeUserRole =
    exports.addRoleToUser =
    exports.init =
        void 0;
const utils_1 = require("../../utils");
const permissionClaim_1 = require("./permissionClaim");
const recipe_1 = __importDefault(require("./recipe"));
const userRoleClaim_1 = require("./userRoleClaim");
class Wrapper {
    static async addRoleToUser(tenantId, userId, role, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.addRoleToUser({
            userId,
            role,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async removeUserRole(tenantId, userId, role, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeUserRole({
            userId,
            role,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getRolesForUser(tenantId, userId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRolesForUser({
            userId,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getUsersThatHaveRole(tenantId, role, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersThatHaveRole({
            role,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async createNewRoleOrAddPermissions(role, permissions, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewRoleOrAddPermissions({
            role,
            permissions,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getPermissionsForRole(role, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getPermissionsForRole({
            role,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async removePermissionsFromRole(role, permissions, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removePermissionsFromRole({
            role,
            permissions,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getRolesThatHavePermission(permission, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRolesThatHavePermission({
            permission,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async deleteRole(role, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.deleteRole({
            role,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getAllRoles(userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllRoles({
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.PermissionClaim = permissionClaim_1.PermissionClaim;
Wrapper.UserRoleClaim = userRoleClaim_1.UserRoleClaim;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.addRoleToUser = Wrapper.addRoleToUser;
exports.removeUserRole = Wrapper.removeUserRole;
exports.getRolesForUser = Wrapper.getRolesForUser;
exports.getUsersThatHaveRole = Wrapper.getUsersThatHaveRole;
exports.createNewRoleOrAddPermissions = Wrapper.createNewRoleOrAddPermissions;
exports.getPermissionsForRole = Wrapper.getPermissionsForRole;
exports.removePermissionsFromRole = Wrapper.removePermissionsFromRole;
exports.getRolesThatHavePermission = Wrapper.getRolesThatHavePermission;
exports.deleteRole = Wrapper.deleteRole;
exports.getAllRoles = Wrapper.getAllRoles;
var userRoleClaim_2 = require("./userRoleClaim");
Object.defineProperty(exports, "UserRoleClaim", {
    enumerable: true,
    get: function () {
        return userRoleClaim_2.UserRoleClaim;
    },
});
var permissionClaim_2 = require("./permissionClaim");
Object.defineProperty(exports, "PermissionClaim", {
    enumerable: true,
    get: function () {
        return permissionClaim_2.PermissionClaim;
    },
});
