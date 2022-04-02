"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PrimitiveClaim {
    constructor(id) {
        this.id = id;
        this.checkers = {
            hasValue: (val) => {
                return {
                    claim: this,
                    shouldRefetch: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === undefined,
                    isValid: (grantPayload, ctx) => this.getValueFromPayload(grantPayload, ctx) === val,
                };
            },
            hasFreshValue: (val, maxAgeInSeconds) => {
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
    addToPayload(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), {
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        });
    }
    removeFromPayload(payload, _userContext) {
        const res = Object.assign({}, payload);
        delete res[this.id];
        return res;
    }
    getValueFromPayload(payload, _userContext) {
        var _a;
        return (_a = payload[this.id]) === null || _a === void 0 ? void 0 : _a.v;
    }
}
exports.PrimitiveClaim = PrimitiveClaim;
