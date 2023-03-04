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

import NormalisedURLPath from '../../normalisedURLPath'
import { Querier } from '../../querier'
import { RecipeInterface } from './types'

export default function getRecipeInterface(querier: Querier): RecipeInterface {
  return {
    addRoleToUser({ userId, role }) {
      return querier.sendPutRequest(new NormalisedURLPath('/recipe/user/role'), { userId, role })
    },

    removeUserRole({ userId, role }) {
      return querier.sendPostRequest(new NormalisedURLPath('/recipe/user/role/remove'), { userId, role })
    },

    getRolesForUser({ userId }) {
      return querier.sendGetRequest(new NormalisedURLPath('/recipe/user/roles'), { userId })
    },

    getUsersThatHaveRole({ role }) {
      return querier.sendGetRequest(new NormalisedURLPath('/recipe/role/users'), { role })
    },

    createNewRoleOrAddPermissions({ role, permissions }) {
      return querier.sendPutRequest(new NormalisedURLPath('/recipe/role'), { role, permissions })
    },

    getPermissionsForRole({ role }) {
      return querier.sendGetRequest(new NormalisedURLPath('/recipe/role/permissions'), { role })
    },

    removePermissionsFromRole({ role, permissions }) {
      return querier.sendPostRequest(new NormalisedURLPath('/recipe/role/permissions/remove'), {
        role,
        permissions,
      })
    },

    getRolesThatHavePermission({ permission }) {
      return querier.sendGetRequest(new NormalisedURLPath('/recipe/permission/roles'), { permission })
    },

    deleteRole({ role }) {
      return querier.sendPostRequest(new NormalisedURLPath('/recipe/role/remove'), { role })
    },

    getAllRoles() {
      return querier.sendGetRequest(new NormalisedURLPath('/recipe/roles'), {})
    },
  }
}
