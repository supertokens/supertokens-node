// @ts-nocheck
import { Awaitable } from "../../../types";
import { SessionClaim, SessionClaimPayloadType } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
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
