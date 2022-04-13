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
                t: new Date().getTime(),
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
                // TODO: we could add current and expected value into a reason
                validate: (grantPayload, ctx) => ({ isValid: this.getValueFromPayload(grantPayload, ctx) === val }),
            };
        },
        hasFreshValue: (val: T, maxAgeInSeconds: number, validatorTypeId?: string): SessionClaimValidator => {
            return {
                claim: this,
                validatorTypeId: validatorTypeId ?? this.key,
                shouldRefetch: (grantPayload, ctx) =>
                    this.getValueFromPayload(grantPayload, ctx) === undefined ||
                    // We know grantPayload[this.id] is defined since the value is not undefined in this branch
                    grantPayload[this.key].t < Date.now() - maxAgeInSeconds * 1000,
                validate: (grantPayload, ctx) => {
                    if (this.getValueFromPayload(grantPayload, ctx) !== val) {
                        return {
                            isValid: false,
                            reason: "wrong value",
                        };
                    }
                    if (grantPayload[this.key].t > Date.now() - maxAgeInSeconds * 1000) {
                        return {
                            isValid: false,
                            reason: "expired",
                        };
                    }
                    return { isValid: true };
                },
            };
        },
    };
}
