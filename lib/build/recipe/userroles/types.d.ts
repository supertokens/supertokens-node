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
export type RecipeInterface = {
    addRoleToUser: (input: { userId: string; role: string; tenantId: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              didUserAlreadyHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    removeUserRole: (input: { userId: string; role: string; tenantId: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              didUserHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    getRolesForUser: (input: { userId: string; tenantId: string; userContext: UserContext }) => Promise<{
        status: "OK";
        roles: string[];
    }>;
    getUsersThatHaveRole: (input: { role: string; tenantId: string; userContext: UserContext }) => Promise<
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
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        createdNewRole: boolean;
    }>;
    getPermissionsForRole: (input: { role: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              permissions: string[];
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    removePermissionsFromRole: (input: { role: string; permissions: string[]; userContext: UserContext }) => Promise<{
        status: "OK" | "UNKNOWN_ROLE_ERROR";
    }>;
    getRolesThatHavePermission: (input: { permission: string; userContext: UserContext }) => Promise<{
        status: "OK";
        roles: string[];
    }>;
    deleteRole: (input: { role: string; userContext: UserContext }) => Promise<{
        status: "OK";
        didRoleExist: boolean;
    }>;
    getAllRoles: (input: { userContext: UserContext }) => Promise<{
        status: "OK";
        roles: string[];
    }>;
};
