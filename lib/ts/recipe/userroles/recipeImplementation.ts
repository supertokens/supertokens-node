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

import { RecipeInterface } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        addRoleToUser: function ({ userId, role }) {
            return querier.sendPutRequest(new NormalisedURLPath("/recipe/user/role"), { userId, role });
        },

        removeUserRole: function ({ userId, role }) {
            return querier.sendPostRequest(new NormalisedURLPath("/recipe/user/role/remove"), { userId, role });
        },

        getRolesForUser: function ({ userId }) {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/user/roles"), { userId });
        },

        getUsersForRole: function ({ role }) {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/role/users"), { role });
        },

        createNewRoleOrAddPermissions: function ({ role, permissions }) {
            return querier.sendPutRequest(new NormalisedURLPath("/recipe/role"), { role, permissions });
        },

        getPermissionsForRole: function ({ role }) {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/role/permissions"), { role });
        },

        removePermissionsFromRole: function ({ role, permissions }) {
            return querier.sendPostRequest(new NormalisedURLPath("/recipe/role/permissions/remove"), {
                role,
                permissions,
            });
        },

        getRolesThatHavePermission: function ({ permission }) {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/permission/roles"), { permission });
        },

        deleteRole: function ({ role }) {
            return querier.sendPostRequest(new NormalisedURLPath("/recipe/role/remove"), { role });
        },

        getAllRoles: function () {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/roles"), {});
        },
    };
}
