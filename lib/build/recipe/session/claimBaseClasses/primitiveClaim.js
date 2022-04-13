"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class PrimitiveClaim {
    constructor(key) {
        this.key = key;
        this.validators = {
            hasValue: (val, validatorTypeId) => {
                return {
                    claim: this,
                    validatorTypeId:
                        validatorTypeId !== null && validatorTypeId !== void 0 ? validatorTypeId : this.key,
                    shouldRefetch: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === undefined,
                    // TODO: we could add current and expected value into a reason
                    validate: (grantPayload, ctx) => ({ isValid: this.getValueFromPayload(grantPayload, ctx) === val }),
                };
            },
            hasFreshValue: (val, maxAgeInSeconds, validatorTypeId) => {
                return {
                    claim: this,
                    validatorTypeId:
                        validatorTypeId !== null && validatorTypeId !== void 0 ? validatorTypeId : this.key,
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
    addToPayload_internal(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), {
            [this.key]: {
                v: value,
                t: new Date().getTime(),
            },
        });
    }
    removeFromPayload_internal(payload, _userContext) {
        const res = Object.assign({}, payload);
        delete res[this.key];
        return res;
    }
    addToSession(session, value, userContext) {
        return session.mergeIntoAccessTokenPayload(this.addToPayload_internal({}, value, userContext));
    }
    addToSessionUsingSessionHandle(sessionHandle, value, userContext) {
        return __1.default.mergeIntoAccessTokenPayload(
            sessionHandle,
            this.addToPayload_internal({}, value, userContext)
        );
    }
    getValueFromPayload(payload, _userContext) {
        var _a;
        return (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.v;
    }
}
exports.PrimitiveClaim = PrimitiveClaim;
