// @ts-nocheck
import { Awaitable, JSONValue } from "../../../types";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface } from "../types";
export declare abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    readonly key: string;
    constructor(key: string);
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    addToPayload_internal(payload: any, value: T, _userContext: any): any;
    removeFromPayload_internal(payload: any, _userContext: any): any;
    addToSession(session: SessionContainerInterface, value: T, userContext?: any): Promise<void>;
    addToSessionUsingSessionHandle(sessionHandle: string, value: T, userContext?: any): Promise<void>;
    getValueFromPayload(payload: any, _userContext?: any): T | undefined;
    validators: {
        hasValue: (val: T, validatorTypeId?: string | undefined) => SessionClaimValidator;
        hasFreshValue: (val: T, maxAgeInSeconds: number, validatorTypeId?: string | undefined) => SessionClaimValidator;
    };
}
