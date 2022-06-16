// @ts-nocheck
import { JSONValue } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";
export declare abstract class PrimitiveClaim<T extends JSONValue> extends SessionClaim<T> {
    constructor(key: string);
    abstract fetchValue(userId: string, userContext: any): Promise<T | undefined> | T | undefined;
    addToPayload_internal(payload: any, value: T, _userContext: any): any;
    removeFromPayload(payload: any, _userContext?: any): any;
    getValueFromPayload(payload: any, _userContext?: any): T | undefined;
    validators: {
        hasValue: (val: T, id?: string | undefined) => SessionClaimValidator;
        hasFreshValue: (val: T, maxAgeInSeconds: number, id?: string | undefined) => SessionClaimValidator;
    };
}
