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

export type TypeInput = {
    skipAddingRolesToAccessToken?: boolean;
    skipAddingPermissionsToAccessToken?: boolean;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    skipAddingRolesToAccessToken: boolean;
    skipAddingPermissionsToAccessToken: boolean;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIInterface = {};

export type RecipeInterface = {
    addRoleToUser: (input: {
        userId: string;
        role: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              didUserAlreadyHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;

    removeUserRole: (input: {
        userId: string;
        role: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              didUserHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;

    getRolesForUser: (input: {
        userId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        roles: string[];
    }>;

    getUsersThatHaveRole: (input: {
        role: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              users: string[];
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;

    createNewRoleOrAddPermissions: (input: {
        role: string;
        permissions: string[];
        userContext: any;
    }) => Promise<{
        status: "OK";
        createdNewRole: boolean;
    }>;

    getPermissionsForRole: (input: {
        role: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              permissions: string[];
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;

    removePermissionsFromRole: (input: {
        role: string;
        permissions: string[];
        userContext: any;
    }) => Promise<{
        status: "OK" | "UNKNOWN_ROLE_ERROR";
    }>;

    getRolesThatHavePermission: (input: {
        permission: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        roles: string[];
    }>;

    deleteRole: (input: {
        role: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didRoleExist: boolean;
    }>;

    getAllRoles: (input: {
        userContext: any;
    }) => Promise<{
        status: "OK";
        roles: string[];
    }>;
};
