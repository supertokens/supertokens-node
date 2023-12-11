import RecipeUserId from "../../../recipeUserId";
import { JSONObject, JSONPrimitive } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";

export class PrimitiveArrayClaim<T extends JSONPrimitive> extends SessionClaim<T[]> {
    public readonly fetchValue: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: any
    ) => Promise<T[] | undefined> | T[] | undefined;
    public readonly defaultMaxAgeInSeconds: number | undefined;

    constructor(config: { key: string; fetchValue: SessionClaim<T[]>["fetchValue"]; defaultMaxAgeInSeconds?: number }) {
        super(config.key);
        this.fetchValue = config.fetchValue;
        this.defaultMaxAgeInSeconds = config.defaultMaxAgeInSeconds;
    }

    addToPayload_internal(payload: any, value: T[], _userContext: any): any {
        return {
            ...payload,
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        };
    }
    removeFromPayloadByMerge_internal(payload: any, _userContext?: any): any {
        const res = {
            ...payload,
            [this.key]: null,
        };

        return res;
    }

    removeFromPayload(payload: any, _userContext?: any): any {
        const res = {
            ...payload,
        };
        delete res[this.key];

        return res;
    }

    getValueFromPayload(payload: any, _userContext?: any): T[] | undefined {
        return payload[this.key]?.v;
    }

    getLastRefetchTime(payload: any, _userContext?: any): number | undefined {
        return payload[this.key]?.t;
    }

    validators = {
        includes: (
            val: T,
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    (maxAgeInSeconds !== undefined && payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: { message: "value does not exist", expectedToInclude: val, actualValue: claimVal },
                        };
                    }
                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    if (!claimVal.includes(val)) {
                        return {
                            isValid: false,
                            reason: { message: "wrong value", expectedToInclude: val, actualValue: claimVal },
                        };
                    }
                    return { isValid: true };
                },
            };
        },
        excludes: (
            val: T,
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    (maxAgeInSeconds !== undefined && payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: {
                                message: "value does not exist",
                                expectedToNotInclude: val,
                                actualValue: claimVal,
                            },
                        };
                    }
                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    if (claimVal.includes(val)) {
                        return {
                            isValid: false,
                            reason: { message: "wrong value", expectedToNotInclude: val, actualValue: claimVal },
                        };
                    }
                    return { isValid: true };
                },
            };
        },
        includesAll: (
            val: T[],
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    (maxAgeInSeconds !== undefined && payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: { message: "value does not exist", expectedToInclude: val, actualValue: claimVal },
                        };
                    }
                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    const claimSet = new Set(claimVal);
                    const isValid = val.every((v) => claimSet.has(v));
                    return isValid
                        ? { isValid }
                        : {
                              isValid,
                              reason: { message: "wrong value", expectedToInclude: val, actualValue: claimVal },
                          };
                },
            };
        },
        includesAny: (
            val: T[],
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    (maxAgeInSeconds !== undefined && payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: {
                                message: "value does not exist",
                                expectedToNotInclude: val,
                                actualValue: claimVal,
                            },
                        };
                    }

                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    const claimSet = new Set(claimVal);
                    const isValid = val.some((v) => claimSet.has(v));
                    return isValid
                        ? { isValid: isValid }
                        : {
                              isValid,
                              reason: {
                                  message: "wrong value",
                                  expectedToIncludeAtLeastOneOf: val,
                                  actualValue: claimVal,
                              },
                          };
                },
            };
        },
        excludesAll: (
            val: T[],
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    // We know payload[this.id] is defined since the value is not undefined in this branch
                    (maxAgeInSeconds !== undefined && payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: {
                                message: "value does not exist",
                                expectedToNotInclude: val,
                                actualValue: claimVal,
                            },
                        };
                    }

                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }
                    const claimSet = new Set(claimVal);
                    const isValid = val.every((v) => !claimSet.has(v));
                    return isValid
                        ? { isValid: isValid }
                        : {
                              isValid,
                              reason: { message: "wrong value", expectedToNotInclude: val, actualValue: claimVal },
                          };
                },
            };
        },
    };
}
