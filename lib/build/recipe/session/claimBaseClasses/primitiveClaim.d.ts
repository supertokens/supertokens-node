// @ts-nocheck
import { JSONValue } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";
export declare class PrimitiveClaim<T extends JSONValue> extends SessionClaim<T> {
    fetchValue: (userId: string, userContext: any) => Promise<T | undefined> | T | undefined;
    constructor(conf: { key: string; fetchValue: SessionClaim<T>["fetchValue"] });
    addToPayload_internal(payload: any, value: T, _userContext: any): any;
    removeFromPayload(payload: any, _userContext?: any): any;
    getValueFromPayload(payload: any, _userContext?: any): T | undefined;
    getLastRefetchTime(payload: any, _userContext?: any): Date | undefined;
    validators: {
        hasValue: (val: T, id?: string | undefined) => SessionClaimValidator;
        hasFreshValue: (val: T, maxAgeInSeconds: number, id?: string | undefined) => SessionClaimValidator;
    };
}
