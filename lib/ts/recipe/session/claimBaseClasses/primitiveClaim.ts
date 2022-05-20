import SessionWrapper from "..";
import { Awaitable, JSONValue } from "../../../types";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface } from "../types";

export abstract class PrimitiveClaim<T extends JSONValue> implements SessionClaim<T> {
    constructor(public readonly key: string) {}

    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;

    addToPayload_internal(payload: any, value: T, _userContext: any): any {
        return {
            ...payload,
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        };
    }
    removeFromPayload_internal(payload: any, _userContext: any): any {
        const res = {
            ...payload,
        };
        delete res[this.key];
        return res;
    }

    addToSession(session: SessionContainerInterface, value: T, userContext?: any) {
        return session.mergeIntoAccessTokenPayload(this.addToPayload_internal({}, value, userContext));
    }

    addToSessionUsingSessionHandle(sessionHandle: string, value: T, userContext?: any) {
        return SessionWrapper.mergeIntoAccessTokenPayload(
            sessionHandle,
            this.addToPayload_internal({}, value, userContext)
        );
    }

    getValueFromPayload(payload: any, _userContext?: any): T | undefined {
        return payload[this.key]?.v;
    }

    validators = {
        hasValue: (val: T, validatorTypeId?: string): SessionClaimValidator => {
            return {
                claim: this,
                validatorTypeId: validatorTypeId ?? this.key,
                shouldRefetch: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === undefined,
                validate: (grantPayload, ctx) => {
                    const claimVal = this.getValueFromPayload(grantPayload, ctx);
                    const isValid = claimVal === val;
                    return isValid
                        ? { isValid: isValid }
                        : { isValid, reason: { expectedValue: val, actualValue: claimVal } };
                },
            };
        },
        hasFreshValue: (val: T, maxAgeInSeconds: number, validatorTypeId?: string): SessionClaimValidator => {
            return {
                claim: this,
                validatorTypeId: validatorTypeId ?? this.key + "-fresh-val",
                shouldRefetch: (grantPayload, ctx) =>
                    this.getValueFromPayload(grantPayload, ctx) === undefined ||
                    // We know grantPayload[this.id] is defined since the value is not undefined in this branch
                    grantPayload[this.key].t < Date.now() - maxAgeInSeconds * 1000,
                validate: (grantPayload, ctx) => {
                    const claimVal = this.getValueFromPayload(grantPayload, ctx);
                    if (claimVal !== val) {
                        return {
                            isValid: false,
                            reason: { message: "wrong value", expectedValue: val, actualValue: claimVal },
                        };
                    }
                    const ageInSeconds = (Date.now() - grantPayload[this.key].t) / 1000;
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
