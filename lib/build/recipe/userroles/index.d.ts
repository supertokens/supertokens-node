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
    ): Promise<import("./types").AddRoleToUserResponse>;
    static removeUserRole(
        tenantId: string,
        userId: string,
        role: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").RemoveUserRoleResponse>;
    static getRolesForUser(
        tenantId: string,
        userId: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").GetRolesForUserResponse>;
    static getUsersThatHaveRole(
        tenantId: string,
        role: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").GetUsersThatHaveRoleResponse>;
    static createNewRoleOrAddPermissions(
        role: string,
        permissions: string[],
        userContext?: Record<string, any>
    ): Promise<import("./types").CreateNewRoleOrAddPermissionsResponse>;
    static getPermissionsForRole(
        role: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").GetPermissionsForRoleResponse>;
    static removePermissionsFromRole(
        role: string,
        permissions: string[],
        userContext?: Record<string, any>
    ): Promise<import("./types").RemovePermissionsFromRoleResponse>;
    static getRolesThatHavePermission(
        permission: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").GetRolesThatHavePermissionResponse>;
    static deleteRole(role: string, userContext?: Record<string, any>): Promise<import("./types").DeleteRoleResponse>;
    static getAllRoles(userContext?: Record<string, any>): Promise<import("./types").GetAllRolesResponse>;
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
export type {
    AddRoleToUserResponse,
    RemoveUserRoleResponse,
    GetRolesForUserResponse,
    GetUsersThatHaveRoleResponse,
    CreateNewRoleOrAddPermissionsResponse,
    GetPermissionsForRoleResponse,
    RemovePermissionsFromRoleResponse,
    GetRolesThatHavePermissionResponse,
    DeleteRoleResponse,
    GetAllRolesResponse,
} from "./types";
