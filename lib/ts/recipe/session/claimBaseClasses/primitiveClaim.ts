import { Awaitable, JSONValue } from "../../../types";
import { SessionClaim, SessionClaimChecker } from "../types";

export abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    constructor(public readonly id: string) {}

    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;

    addToPayload(payload: any, value: T, _userContext: any): any {
        return {
            ...payload,
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        };
    }
    removeFromPayload(payload: any, _userContext: any): any {
        const res = {
            ...payload,
        };
        delete res[this.id];
        return res;
    }

    getValueFromPayload(payload: any, _userContext: any): T | undefined {
        return payload[this.id]?.v;
    }

    checkers = {
        hasValue: (val: T): SessionClaimChecker => {
            return {
                claim: this,
                shouldRefetch: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === undefined,
                isValid: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === val,
            };
        },
        hasFreshValue: (val: T, maxAgeInSeconds: number): SessionClaimChecker => {
            return {
                claim: this,
                shouldRefetch: (grantPayload, ctx) =>
                    this.getValueFromPayload(grantPayload, ctx) === undefined ||
                    // We know grantPayload[this.id] is defined since the value is not undefined in this branch
                    grantPayload[this.id].t < Date.now() - maxAgeInSeconds * 1000,
                isValid: (grantPayload, ctx) =>
                    this.getValueFromPayload(grantPayload, ctx) === val &&
                    // We know grantPayload[this.id] is defined since we already checked the value is as expected
                    grantPayload[this.id].t > Date.now() - maxAgeInSeconds * 1000,
            };
        },
    };
}
