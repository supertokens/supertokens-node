// @ts-nocheck
import { Awaitable, JSONValue } from "../../../types";
import { SessionClaim, SessionClaimChecker } from "../types";
export declare abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    readonly id: string;
    constructor(id: string);
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    addToPayload(payload: any, value: T, _userContext: any): any;
    removeFromPayload(payload: any, _userContext: any): any;
    getValueFromPayload(payload: any, _userContext: any): T | undefined;
    checkers: {
        hasValue: (val: T) => SessionClaimChecker;
        hasFreshValue: (val: T, maxAgeInSeconds: number) => SessionClaimChecker;
    };
}
