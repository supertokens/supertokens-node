import { Awaitable } from "../../../types";
import { SessionClaim, SessionClaimPayloadType } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

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
