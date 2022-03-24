import { Awaitable, JSONValue } from "../../../types";
import { SessionClaim, SessionClaimPayloadType } from "../types";

export abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    constructor(public readonly id: string) {}

    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    abstract shouldRefetch(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
    abstract isValid(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;

    addToPayload(payload: SessionClaimPayloadType, value: T, _userContext: any): SessionClaimPayloadType {
        return {
            ...payload,
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        };
    }
    removeFromPayload(payload: SessionClaimPayloadType, _userContext: any): SessionClaimPayloadType {
        const res = {
            ...payload,
        };
        delete res[this.id];
        return res;
    }
}
