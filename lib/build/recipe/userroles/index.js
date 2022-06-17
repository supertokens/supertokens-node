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
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
class Wrapper {
    static addRoleToUser(userId, role, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.addRoleToUser({
                userId,
                role,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static removeUserRole(userId, role, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeUserRole({
                userId,
                role,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getRolesForUser(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRolesForUser({
                userId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getUsersThatHaveRole(role, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersThatHaveRole({
                role,
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
