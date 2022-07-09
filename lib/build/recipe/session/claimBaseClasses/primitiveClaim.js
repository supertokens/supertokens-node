"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
class PrimitiveClaim extends types_1.SessionClaim {
    constructor(config) {
        super(config.key);
        this.validators = {
            hasValue: (val, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
                    shouldRefetch: (payload, ctx) => this.getValueFromPayload(payload, ctx) === undefined,
                    validate: (payload, ctx) => {
                        const claimVal = this.getValueFromPayload(payload, ctx);
                        const isValid = claimVal === val;
                        return isValid
                            ? { isValid: isValid }
                            : {
                                  isValid,
                                  reason: { message: "wrong value", expectedValue: val, actualValue: claimVal },
                              };
                    },
                };
            },
            hasFreshValue: (val, maxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key + "-fresh-val",
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
        this.fetchValue = config.fetchValue;
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
exports.PrimitiveClaim = PrimitiveClaim;
