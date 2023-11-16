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
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("../multitenancy/constants");
function getRecipeInterface(querier) {
    return {
        addRoleToUser: function ({ userId, role, tenantId, userContext }) {
            return querier.sendPutRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/user/role`
                ),
                { userId, role },
                userContext
            );
        },
        removeUserRole: function ({ userId, role, tenantId, userContext }) {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/user/role/remove`
                ),
                { userId, role },
                userContext
            );
        },
        getRolesForUser: function ({ userId, tenantId, userContext }) {
            return querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/user/roles`
                ),
                { userId },
                userContext
            );
        },
        getUsersThatHaveRole: function ({ role, tenantId, userContext }) {
            return querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/role/users`
                ),
                { role },
                userContext
            );
        },
        createNewRoleOrAddPermissions: function ({ role, permissions, userContext }) {
            return querier.sendPutRequest(
                new normalisedURLPath_1.default("/recipe/role"),
                { role, permissions },
                userContext
            );
        },
        getPermissionsForRole: function ({ role, userContext }) {
            return querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/role/permissions"),
                { role },
                userContext
            );
        },
        removePermissionsFromRole: function ({ role, permissions, userContext }) {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/role/permissions/remove"),
                {
                    role,
                    permissions,
                },
                userContext
            );
        },
        getRolesThatHavePermission: function ({ permission, userContext }) {
            return querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/permission/roles"),
                { permission },
                userContext
            );
        },
        deleteRole: function ({ role, userContext }) {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/role/remove"),
                { role },
                userContext
            );
        },
        getAllRoles: function (userContext) {
            return querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/roles"), {}, userContext);
        },
    };
}
exports.default = getRecipeInterface;
