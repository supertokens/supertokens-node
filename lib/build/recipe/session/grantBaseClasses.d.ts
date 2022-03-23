// @ts-nocheck
import { Awaitable, JSONValue } from "../../types";
import { SessionClaim, SessionClaimPayloadType } from "./types";
export declare abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    readonly id: string;
    constructor(id: string);
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    abstract shouldRefetch(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
    abstract isValid(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
    addToPayload(payload: SessionClaimPayloadType, value: T, _userContext: any): SessionClaimPayloadType;
    removeFromPayload(payload: SessionClaimPayloadType, _userContext: any): SessionClaimPayloadType;
}
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    readonly shouldRefetch: SessionClaim<boolean>["shouldRefetch"];
    readonly fetch: SessionClaim<boolean>["fetch"];
    constructor(conf: {
        id: string;
        fetch: SessionClaim<boolean>["fetch"];
        shouldRefetch: SessionClaim<boolean>["shouldRefetch"];
    });
    isValid(payload: SessionClaimPayloadType, _userContext: any): Awaitable<boolean>;
}
export declare class ManualBooleanClaim extends BooleanClaim {
    private conf;
    constructor(conf: { id: string; expirationTimeInSeconds?: number });
    isValid(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
}
