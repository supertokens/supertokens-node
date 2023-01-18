// @ts-nocheck
import STError from "../../error";
export declare class TenantDoesNotExistError extends STError {
    constructor(options: { type: "TENANT_DOES_NOT_EXIST_ERROR"; message: string });
}
export declare class RecipeDisabledForTenantError extends STError {
    constructor(options: { type: "RECIPE_DISABLED_FOR_TENANT_ERROR"; message: string });
}
