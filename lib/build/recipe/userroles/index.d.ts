// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static PermissionClaim: import("./permissionClaim").PermissionClaimClass;
    static UserRoleClaim: import("./userRoleClaim").UserRoleClaimClass;
    static addRoleToUser(
        tenantId: string,
        userId: string,
        role: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              didUserAlreadyHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    static removeUserRole(
        tenantId: string,
        userId: string,
        role: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              didUserHaveRole: boolean;
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    static getRolesForUser(
        tenantId: string,
        userId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        roles: string[];
    }>;
    static getUsersThatHaveRole(
        tenantId: string,
        role: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              users: string[];
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    static createNewRoleOrAddPermissions(
        role: string,
        permissions: string[],
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        createdNewRole: boolean;
    }>;
    static getPermissionsForRole(
        role: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              permissions: string[];
          }
        | {
              status: "UNKNOWN_ROLE_ERROR";
          }
    >;
    static removePermissionsFromRole(
        role: string,
        permissions: string[],
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK" | "UNKNOWN_ROLE_ERROR";
    }>;
    static getRolesThatHavePermission(
        permission: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        roles: string[];
    }>;
    static deleteRole(
        role: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        didRoleExist: boolean;
    }>;
    static getAllRoles(userContext?: Record<string, any>): Promise<{
        status: "OK";
        roles: string[];
    }>;
}
export declare const init: typeof Recipe.init;
export declare const addRoleToUser: typeof Wrapper.addRoleToUser;
export declare const removeUserRole: typeof Wrapper.removeUserRole;
export declare const getRolesForUser: typeof Wrapper.getRolesForUser;
export declare const getUsersThatHaveRole: typeof Wrapper.getUsersThatHaveRole;
export declare const createNewRoleOrAddPermissions: typeof Wrapper.createNewRoleOrAddPermissions;
export declare const getPermissionsForRole: typeof Wrapper.getPermissionsForRole;
export declare const removePermissionsFromRole: typeof Wrapper.removePermissionsFromRole;
export declare const getRolesThatHavePermission: typeof Wrapper.getRolesThatHavePermission;
export declare const deleteRole: typeof Wrapper.deleteRole;
export declare const getAllRoles: typeof Wrapper.getAllRoles;
export { UserRoleClaim } from "./userRoleClaim";
export { PermissionClaim } from "./permissionClaim";
export type { RecipeInterface };
