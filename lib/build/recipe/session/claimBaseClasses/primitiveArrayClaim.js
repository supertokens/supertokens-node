"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimitiveArrayClaim = void 0;
const types_1 = require("../types");
class PrimitiveArrayClaim extends types_1.SessionClaim {
    constructor(config) {
        super(config.key);
        this.validators = {
            includes: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
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
                                    expectedToInclude: val,
                                    actualValue: claimVal,
                                },
                            };
                        }
                        const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)) / 1000;
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
            excludes: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
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
                        const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)) / 1000;
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
            includesAll: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
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
                                    expectedToInclude: val,
                                    actualValue: claimVal,
                                },
                            };
                        }
                        const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)) / 1000;
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
            includesAny: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
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
                        const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)) / 1000;
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
            excludesAll: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
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
                        const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)) / 1000;
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
        this.fetchValue = config.fetchValue;
        this.defaultMaxAgeInSeconds = config.defaultMaxAgeInSeconds;
    }
    addToPayload_internal(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), {
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        });
    }
    removeFromPayloadByMerge_internal(payload, _userContext) {
        const res = Object.assign(Object.assign({}, payload), { [this.key]: null });
        return res;
    }
    removeFromPayload(payload, _userContext) {
        const res = Object.assign({}, payload);
        delete res[this.key];
        return res;
    }
    getValueFromPayload(payload, _userContext) {
        var _a;
        return (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.v;
    }
    getLastRefetchTime(payload, _userContext) {
        var _a;
        return (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.t;
    }
}
exports.PrimitiveArrayClaim = PrimitiveArrayClaim;
