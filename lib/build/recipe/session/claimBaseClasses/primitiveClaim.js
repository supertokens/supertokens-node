"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
class PrimitiveClaim extends types_1.SessionClaim {
    constructor(key) {
        super(key);
        this.validators = {
            hasValue: (val, validatorTypeId) => {
                return {
                    claim: this,
                    validatorTypeId:
                        validatorTypeId !== null && validatorTypeId !== void 0 ? validatorTypeId : this.key,
                    shouldRefetch: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === undefined,
                    validate: (grantPayload, ctx) => {
                        const claimVal = this.getValueFromPayload(grantPayload, ctx);
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
            hasFreshValue: (val, maxAgeInSeconds, validatorTypeId) => {
                return {
                    claim: this,
                    validatorTypeId:
                        validatorTypeId !== null && validatorTypeId !== void 0
                            ? validatorTypeId
                            : this.key + "-fresh-val",
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
    addToPayload_internal(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), {
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        });
    }
    removeFromPayload(payload, _userContext) {
        const res = Object.assign(Object.assign({}, payload), { [this.key]: null });
        return res;
    }
    getValueFromPayload(payload, _userContext) {
        var _a;
        return (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.v;
    }
}
exports.PrimitiveClaim = PrimitiveClaim;
