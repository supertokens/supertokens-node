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

import OverrideableBuilder from "supertokens-js-override";
import { UserContext } from "../../types";

export type TypeInput = {
    skipAddingRolesToAccessToken?: boolean;
    skipAddingPermissionsToAccessToken?: boolean;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    skipAddingRolesToAccessToken: boolean;
    skipAddingPermissionsToAccessToken: boolean;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIInterface = {};

export type AddRoleToUserResponse =
    | {
          status: "OK";
          didUserAlreadyHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      };

export type RemoveUserRoleResponse =
    | {
          status: "OK";
          didUserHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      };

export type GetRolesForUserResponse = {
    status: "OK";
    roles: string[];
};

export type GetUsersThatHaveRoleResponse =
    | {
          status: "OK";
          users: string[];
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      };

export type CreateNewRoleOrAddPermissionsResponse = {
    status: "OK";
    createdNewRole: boolean;
};

export type GetPermissionsForRoleResponse =
    | {
          status: "OK";
          permissions: string[];
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      };

export type RemovePermissionsFromRoleResponse = {
    status: "OK" | "UNKNOWN_ROLE_ERROR";
};

export type GetRolesThatHavePermissionResponse = {
    status: "OK";
    roles: string[];
};

export type DeleteRoleResponse = {
    status: "OK";
    didRoleExist: boolean;
};

export type GetAllRolesResponse = {
    status: "OK";
    roles: string[];
};

export type RecipeInterface = {
    addRoleToUser: (input: {
        userId: string;
        role: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<AddRoleToUserResponse>;

    removeUserRole: (input: {
        userId: string;
        role: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<RemoveUserRoleResponse>;

    getRolesForUser: (input: {
        userId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<GetRolesForUserResponse>;

    getUsersThatHaveRole: (input: {
        role: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<GetUsersThatHaveRoleResponse>;

    createNewRoleOrAddPermissions: (input: {
        role: string;
        permissions: string[];
        userContext: UserContext;
    }) => Promise<CreateNewRoleOrAddPermissionsResponse>;

    getPermissionsForRole: (input: {
        role: string;
        userContext: UserContext;
    }) => Promise<GetPermissionsForRoleResponse>;

    removePermissionsFromRole: (input: {
        role: string;
        permissions: string[];
        userContext: UserContext;
    }) => Promise<RemovePermissionsFromRoleResponse>;

    getRolesThatHavePermission: (input: {
        permission: string;
        userContext: UserContext;
    }) => Promise<GetRolesThatHavePermissionResponse>;

    deleteRole: (input: { role: string; userContext: UserContext }) => Promise<DeleteRoleResponse>;

    getAllRoles: (input: { userContext: UserContext }) => Promise<GetAllRolesResponse>;
};
