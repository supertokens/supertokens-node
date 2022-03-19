// @ts-nocheck
import { Awaitable } from "../../types";
import { Grant, GrantPayloadType } from "./types";
export declare abstract class PrimitiveGrant<T> implements Grant<T> {
    readonly id: string;
    constructor(id: string);
    abstract fetchGrant(userId: string, userContext: any): Awaitable<T | undefined>;
    abstract shouldRefetchGrant(grantPayload: any, userContext: any): Awaitable<boolean>;
    abstract isGrantValid(grantPayload: any, userContext: any): Awaitable<boolean>;
    addToGrantPayload(grantPayload: GrantPayloadType, value: T, _userContext: any): GrantPayloadType;
    removeFromGrantPayload(grantPayload: GrantPayloadType, _userContext: any): GrantPayloadType;
}
export declare class BooleanGrant extends PrimitiveGrant<boolean> {
    readonly shouldRefetchGrant: Grant<boolean>["shouldRefetchGrant"];
    readonly fetchGrant: Grant<boolean>["fetchGrant"];
    constructor(conf: {
        id: string;
        fetchGrant: Grant<boolean>["fetchGrant"];
        shouldRefetchGrant: Grant<boolean>["shouldRefetchGrant"];
    });
    isGrantValid(grantPayload: GrantPayloadType, _userContext: any): Awaitable<boolean>;
}
export declare class ManualBooleanGrant extends BooleanGrant {
    private conf;
    constructor(conf: { id: string; expirationTimeInSeconds?: number });
    isGrantValid(grantPayload: GrantPayloadType, userContext: any): Awaitable<boolean>;
}
