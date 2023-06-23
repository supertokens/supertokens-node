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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionClaim = exports.UserRoleClaim = exports.getAllRoles = exports.deleteRole = exports.getRolesThatHavePermission = exports.removePermissionsFromRole = exports.getPermissionsForRole = exports.createNewRoleOrAddPermissions = exports.getUsersThatHaveRole = exports.getRolesForUser = exports.removeUserRole = exports.addRoleToUser = exports.init = void 0;
const permissionClaim_1 = require("./permissionClaim");
const recipe_1 = __importDefault(require("./recipe"));
const userRoleClaim_1 = require("./userRoleClaim");
class Wrapper {
    static addRoleToUser(userId, role, tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.addRoleToUser({
                userId,
                role,
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static removeUserRole(userId, role, tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeUserRole({
                userId,
                role,
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getRolesForUser(userId, tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRolesForUser({
                userId,
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getUsersThatHaveRole(role, tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersThatHaveRole({
                role,
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static createNewRoleOrAddPermissions(role, permissions, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewRoleOrAddPermissions({
                role,
                permissions,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getPermissionsForRole(role, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getPermissionsForRole({
                role,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static removePermissionsFromRole(role, permissions, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removePermissionsFromRole({
                role,
                permissions,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getRolesThatHavePermission(permission, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRolesThatHavePermission({
                permission,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static deleteRole(role, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.deleteRole({
                role,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getAllRoles(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllRoles({
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.PermissionClaim = permissionClaim_1.PermissionClaim;
Wrapper.UserRoleClaim = userRoleClaim_1.UserRoleClaim;
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
