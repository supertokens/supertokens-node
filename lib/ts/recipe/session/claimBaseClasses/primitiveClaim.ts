import { JSONValue } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";

export class PrimitiveClaim<T extends JSONValue> extends SessionClaim<T> {
    public fetchValue: (userId: string, userContext: any) => Promise<T | undefined> | T | undefined;

    constructor(config: { key: string; fetchValue: SessionClaim<T>["fetchValue"] }) {
        super(config.key);
        this.fetchValue = config.fetchValue;
    }

    addToPayload_internal(payload: any, value: T, _userContext: any): any {
        return {
            ...payload,
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        };
    }
    removeFromPayload(payload: any, _userContext?: any): any {
        const res = {
            ...payload,
            [this.key]: null,
        };

        return res;
    }

    getValueFromPayload(payload: any, _userContext?: any): T | undefined {
        return payload[this.key]?.v;
    }

    getLastRefetchTime(payload: any, _userContext?: any): number | undefined {
        return payload[this.key]?.t;
    }

    validators = {
        hasValue: (val: T, id?: string): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) => this.getValueFromPayload(payload, ctx) === undefined,
                validate: (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    const isValid = claimVal === val;
                    return isValid
                        ? { isValid: isValid }
                        : { isValid, reason: { message: "wrong value", expectedValue: val, actualValue: claimVal } };
                },
            };
        },
        hasFreshValue: (val: T, maxAgeInSeconds: number, id?: string): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key + "-fresh-val",
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    payload[this.key].t < Date.now() - maxAgeInSeconds * 1000,
                validate: (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal !== val) {
                        return {
                            isValid: false,
                            reason: { message: "wrong value", expectedValue: val, actualValue: claimVal },
                        };
                    }
                    const ageInSeconds = (Date.now() - payload[this.key].t) / 1000;
                    if (ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    return { isValid: true };
                },
            };
        },
    };
}
