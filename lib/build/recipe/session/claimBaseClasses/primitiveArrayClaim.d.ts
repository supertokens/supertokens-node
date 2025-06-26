// @ts-nocheck
import RecipeUserId from "../../../recipeUserId";
import { JSONObject, JSONPrimitive, UserContext } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";
export declare class PrimitiveArrayClaim<T extends JSONPrimitive> extends SessionClaim<T[]> {
    readonly fetchValue: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => Promise<T[] | undefined> | T[] | undefined;
    readonly defaultMaxAgeInSeconds: number | undefined;
    constructor(config: { key: string; fetchValue: SessionClaim<T[]>["fetchValue"]; defaultMaxAgeInSeconds?: number });
    addToPayload_internal(payload: any, value: T[], _userContext: UserContext): any;
    removeFromPayloadByMerge_internal(payload: any, _userContext: UserContext): any;
    removeFromPayload(payload: any, _userContext: UserContext): any;
    getValueFromPayload(payload: any, _userContext: UserContext): T[] | undefined;
    getLastRefetchTime(payload: any, _userContext: UserContext): number | undefined;
    validators: {
        includes: (val: T, maxAgeInSeconds?: number | undefined, id?: string) => SessionClaimValidator;
        excludes: (val: T, maxAgeInSeconds?: number | undefined, id?: string) => SessionClaimValidator;
        includesAll: (val: T[], maxAgeInSeconds?: number | undefined, id?: string) => SessionClaimValidator;
        includesAny: (val: T[], maxAgeInSeconds?: number | undefined, id?: string) => SessionClaimValidator;
        excludesAll: (val: T[], maxAgeInSeconds?: number | undefined, id?: string) => SessionClaimValidator;
    };
}
