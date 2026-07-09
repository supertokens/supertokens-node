// @ts-nocheck
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
