"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
class PrimitiveClaim extends types_1.SessionClaim {
    constructor(config) {
        super(config.key);
        this.validators = {
            hasValue: (val, maxAgeInSeconds = this.defaultMaxAgeInSeconds, id) => {
                return {
                    claim: this,
                    id: id !== null && id !== void 0 ? id : this.key,
                    shouldRefetch: (payload, ctx) =>
                        this.getValueFromPayload(payload, ctx) === undefined ||
                        (maxAgeInSeconds !== undefined && // We know payload[this.id] is defined since the value is not undefined in this branch
                            payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                    validate: (payload, ctx) =>
                        __awaiter(this, void 0, void 0, function* () {
                            const claimVal = this.getValueFromPayload(payload, ctx);
                            if (claimVal === undefined) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: "value does not exist",
                                        expectedValue: val,
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
                            if (claimVal !== val) {
                                return {
                                    isValid: false,
                                    reason: { message: "wrong value", expectedValue: val, actualValue: claimVal },
                                };
                            }
                            return { isValid: true };
                        }),
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
exports.PrimitiveClaim = PrimitiveClaim;
