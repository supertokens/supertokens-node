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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
function getRecipeInterface(querier) {
    return {
        addRoleToUser: function ({ userId, role, tenantId, userContext }) {
            return querier.sendPutRequest(
                {
                    path: "/<tenantId>/recipe/user/role",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { userId, role },
                {},
                userContext
            );
        },
        removeUserRole: function ({ userId, role, tenantId, userContext }) {
            return querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/role/remove",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { userId, role },
                userContext
            );
        },
        getRolesForUser: function ({ userId, tenantId, userContext }) {
            return querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/user/roles",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { userId },
                userContext
            );
        },
        getUsersThatHaveRole: function ({ role, tenantId, userContext }) {
            return querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/role/users",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { role },
                userContext
            );
        },
        createNewRoleOrAddPermissions: function ({ role, permissions, userContext }) {
            return querier.sendPutRequest("/recipe/role", { role, permissions }, {}, userContext);
        },
        getPermissionsForRole: function ({ role, userContext }) {
            return querier.sendGetRequest("/recipe/role/permissions", { role }, userContext);
        },
        removePermissionsFromRole: function ({ role, permissions, userContext }) {
            return querier.sendPostRequest(
                "/recipe/role/permissions/remove",
                {
                    role,
                    permissions,
                },
                userContext
            );
        },
        getRolesThatHavePermission: function ({ permission, userContext }) {
            return querier.sendGetRequest("/recipe/permission/roles", { permission }, userContext);
        },
        deleteRole: function ({ role, userContext }) {
            return querier.sendPostRequest("/recipe/role/remove", { role }, userContext);
        },
        getAllRoles: function ({ userContext }) {
            return querier.sendGetRequest("/recipe/roles", {}, userContext);
        },
    };
}
