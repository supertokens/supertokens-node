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
exports.MfaClaim = exports.MfaClaimClass = void 0;
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class MfaClaimClass extends claims_1.SessionClaim {
    constructor() {
        super("st-mfa");
        this.validators = {
            hasCompletedFactors: (factorIds = []) => ({
                id: this.key,
                validate: (_payload, _userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        var _a, _b;
                        let claimValue = yield this.getValueFromPayload(_payload, _userContext);
                        if (claimValue === undefined) return { isValid: true }; // If claim is not present, then it is valid
                        let incompleteRequiredFactors = [];
                        if (factorIds.length === 0) {
                            // Check all factors
                            incompleteRequiredFactors = (_a = claimValue.next) !== null && _a !== void 0 ? _a : [];
                        } else {
                            // Check specific factors
                            let completedFactors = new Set(
                                Object.keys(
                                    (_b = claimValue === null || claimValue === void 0 ? void 0 : claimValue.c) !==
                                        null && _b !== void 0
                                        ? _b
                                        : {}
                                )
                            );
                            incompleteRequiredFactors = factorIds.filter((factorId) => !completedFactors.has(factorId));
                        }
                        if (incompleteRequiredFactors.length === 0) {
                            return { isValid: true };
                        } else {
                            return {
                                isValid: false,
                                reason: {
                                    message: "Need to complete one of the required factors",
                                    choices: incompleteRequiredFactors,
                                },
                            };
                        }
                    }),
            }),
            hasCompletedFactorWithinTime: (_factorId, _timeInSec) => ({
                id: this.key,
                validate: (_payload, _userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        var _c;
                        let claimValue = yield this.getValueFromPayload(_payload, _userContext);
                        if (claimValue === undefined) return { isValid: true }; // If claim is not present, then it is valid
                        const factorCompletedAt = (_c = claimValue.c[_factorId]) !== null && _c !== void 0 ? _c : 0;
                        const currentTime = new Date().getTime(); // TODO: Test for timezone issues?
                        const isValid = currentTime - factorCompletedAt < _timeInSec * 1000;
                        if (isValid) {
                            return { isValid: true };
                        } else {
                            return {
                                isValid: false,
                                reason: {
                                    message: "Need to complete one of the required factors",
                                    choices: [_factorId],
                                },
                            };
                        }
                    }),
            }),
        };
        this.fetchValue = (_session, _userId, _recipeUserId, _userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                // TODO: Should take defaultFirstFactors from config?
                return { c: {}, next: [] };
            });
    }
    addToPayload_internal(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), { [this.key]: value });
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
        return payload[this.key];
    }
}
exports.MfaClaimClass = MfaClaimClass;
exports.MfaClaim = new MfaClaimClass();
