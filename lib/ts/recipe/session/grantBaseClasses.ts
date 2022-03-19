import { Awaitable } from "../../types";
import { Grant, GrantPayloadType } from "./types";

export abstract class PrimitiveGrant<T> implements Grant<T> {
    constructor(public readonly id: string) {}

    abstract fetchGrant(userId: string, userContext: any): Awaitable<T | undefined>;
    abstract shouldRefetchGrant(grantPayload: any, userContext: any): Awaitable<boolean>;
    abstract isGrantValid(grantPayload: any, userContext: any): Awaitable<boolean>;

    addToGrantPayload(grantPayload: GrantPayloadType, value: T, _userContext: any): GrantPayloadType {
        return {
            ...grantPayload,
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        };
    }
    removeFromGrantPayload(grantPayload: GrantPayloadType, _userContext: any): GrantPayloadType {
        const res = {
            ...grantPayload,
        };
        delete res[this.id];
        return res;
    }
}

export class BooleanGrant extends PrimitiveGrant<boolean> {
    public readonly shouldRefetchGrant: Grant<boolean>["shouldRefetchGrant"];
    public readonly fetchGrant: Grant<boolean>["fetchGrant"];

    constructor(conf: {
        id: string;
        fetchGrant: Grant<boolean>["fetchGrant"];
        shouldRefetchGrant: Grant<boolean>["shouldRefetchGrant"];
    }) {
        super(conf.id);

        this.fetchGrant = conf.fetchGrant;
        this.shouldRefetchGrant = conf.shouldRefetchGrant;
    }

    isGrantValid(grantPayload: GrantPayloadType, _userContext: any): Awaitable<boolean> {
        return grantPayload[this.id] !== undefined && grantPayload[this.id].v;
    }
}

export class ManualBooleanGrant extends BooleanGrant {
    constructor(private conf: { id: string; expirationTimeInSeconds?: number }) {
        super({
            id: conf.id,
            async fetchGrant(_userId: string, _userContext: any): Promise<boolean | undefined> {
                return undefined;
            },
            shouldRefetchGrant(_grantPayload: any, _userContext: any): boolean {
                return false;
            },
        });
    }

    isGrantValid(grantPayload: GrantPayloadType, userContext: any): Awaitable<boolean> {
        return (
            super.isGrantValid(grantPayload, userContext) &&
            this.conf.expirationTimeInSeconds !== undefined &&
            grantPayload[this.id].t < new Date().getTime() - this.conf.expirationTimeInSeconds * 1000
        );
    }
}
