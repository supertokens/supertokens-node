import { Awaitable, JSONValue } from "../../types";
import { SessionClaim, SessionClaimPayloadType } from "./types";

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

export class BooleanClaim extends PrimitiveClaim<boolean> {
    public readonly shouldRefetch: SessionClaim<boolean>["shouldRefetch"];
    public readonly fetch: SessionClaim<boolean>["fetch"];

    constructor(conf: {
        id: string;
        fetch: SessionClaim<boolean>["fetch"];
        shouldRefetch: SessionClaim<boolean>["shouldRefetch"];
    }) {
        super(conf.id);

        this.fetch = conf.fetch;
        this.shouldRefetch = conf.shouldRefetch;
    }

    isValid(payload: SessionClaimPayloadType, _userContext: any): Awaitable<boolean> {
        return payload[this.id] !== undefined && payload[this.id].v === true;
    }
}

export class ManualBooleanClaim extends BooleanClaim {
    constructor(private conf: { id: string; expirationTimeInSeconds?: number }) {
        super({
            id: conf.id,
            async fetch(_userId: string, _userContext: any): Promise<boolean | undefined> {
                return undefined;
            },
            shouldRefetch(_payload: SessionClaimPayloadType, _userContext: any): boolean {
                return false;
            },
        });
    }

    isValid(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean> {
        return (
            super.isValid(payload, userContext) &&
            this.conf.expirationTimeInSeconds !== undefined &&
            payload[this.id] !== null &&
            payload[this.id] !== undefined &&
            payload[this.id].t! < new Date().getTime() - this.conf.expirationTimeInSeconds * 1000
        );
    }
}
