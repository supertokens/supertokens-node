// @ts-nocheck
import { Awaitable, JSONValue } from "../../../types";
import { SessionClaimBuilder, SessionClaimValidator } from "../types";
export declare abstract class PrimitiveClaim<T extends JSONValue> extends SessionClaimBuilder<T> {
    constructor(key: string);
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    addToPayload_internal(payload: any, value: T, _userContext: any): any;
    removeFromPayload(payload: any, _userContext: any): any;
    getValueFromPayload(payload: any, _userContext?: any): T | undefined;
    validators: {
        hasValue: (val: T, validatorTypeId?: string | undefined) => SessionClaimValidator;
        hasFreshValue: (val: T, maxAgeInSeconds: number, validatorTypeId?: string | undefined) => SessionClaimValidator;
    };
}
