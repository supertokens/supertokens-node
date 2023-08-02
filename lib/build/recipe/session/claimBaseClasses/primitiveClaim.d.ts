// @ts-nocheck
import RecipeUserId from "../../../recipeUserId";
import { JSONPrimitive } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";
export declare class PrimitiveClaim<T extends JSONPrimitive> extends SessionClaim<T> {
    readonly fetchValue: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        userContext: any
    ) => Promise<T | undefined> | T | undefined;
    readonly defaultMaxAgeInSeconds: number | undefined;
    constructor(config: { key: string; fetchValue: SessionClaim<T>["fetchValue"]; defaultMaxAgeInSeconds?: number });
    addToPayload_internal(payload: any, value: T, _userContext: any): any;
    removeFromPayloadByMerge_internal(payload: any, _userContext?: any): any;
    removeFromPayload(payload: any, _userContext?: any): any;
    getValueFromPayload(payload: any, _userContext?: any): T | undefined;
    getLastRefetchTime(payload: any, _userContext?: any): number | undefined;
    validators: {
        hasValue: (val: T, maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
    };
}
