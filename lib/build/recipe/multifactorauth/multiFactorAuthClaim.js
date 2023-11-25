"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFactorAuthClaim = exports.MultiFactorAuthClaimClass = void 0;
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class MultiFactorAuthClaimClass extends claims_1.SessionClaim {
    constructor(key) {
        super(key !== null && key !== void 0 ? key : "st-mfa");
        this.fetchValue = (_userId, _recipeUserId, _tenantId, _userContext) => {
            // Nothing to fetch, the values are populated on
            // completion of authentication steps
            return {
                c: {},
                n: [],
            };
        };
        this.addToPayload_internal = (payload, value) => {
            const prevValue = payload[this.key];
            return Object.assign(Object.assign({}, payload), {
                [this.key]: {
                    c: Object.assign(
                        Object.assign({}, prevValue === null || prevValue === void 0 ? void 0 : prevValue.c),
                        value.c
                    ),
                    n: value.n,
                },
            });
        };
        this.removeFromPayload = (payload) => {
            const retVal = Object.assign({}, payload);
            delete retVal[this.key];
            return retVal;
        };
        this.removeFromPayloadByMerge_internal = () => {
            return {
                [this.key]: null,
            };
        };
        this.getValueFromPayload = (payload) => {
            return payload[this.key];
        };
        this.validators = {
            passesMFARequirements: (requirements, id) => ({
                claim: this,
                id: id !== null && id !== void 0 ? id : this.key,
                shouldRefetch: () => false,
                validate: async (payload) => {
                    if (requirements === undefined || requirements.length === 0) {
                        return {
                            isValid: true, // No requirements to satisfy
                        };
                    }
                    const claimVal = this.getValueFromPayload(payload);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: {
                                message: "does not satisfy MFA requirements",
                                mfaRequirements: requirements,
                            },
                        };
                    }
                    const { c } = claimVal;
                    for (const req of requirements) {
                        if (typeof req === "string") {
                            if (c[req] === undefined) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: `does not satisfy the factorId: ${req}`,
                                        mfaRequirements: requirements,
                                    },
                                };
                            }
                        } else if ("oneOf" in req) {
                            let satisfied = false;
                            for (const factorId of req.oneOf) {
                                if (c[factorId] !== undefined) {
                                    satisfied = true;
                                    break;
                                }
                            }
                            if (!satisfied) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: `does not satisfy the factorId: ${req.oneOf.join(" or ")}`,
                                        mfaRequirements: requirements,
                                    },
                                };
                            }
                        } else if ("allOf" in req) {
                            for (const factorId of req.allOf) {
                                if (c[factorId] === undefined) {
                                    return {
                                        isValid: false,
                                        reason: {
                                            message: `does not satisfy the factorId: ${factorId}`,
                                            mfaRequirements: requirements,
                                        },
                                    };
                                }
                            }
                        } else {
                            throw new Error("should never come here");
                        }
                    }
                    return {
                        isValid: true, // all requirements satisfied
                    };
                },
            }),
        };
    }
    buildNextArray(completedClaims, requirements) {
        for (const req of requirements) {
            const nextFactors = new Set();
            if (typeof req === "string") {
                if (completedClaims[req] === undefined) {
                    nextFactors.add(req);
                }
            } else if ("oneOf" in req) {
                let satisfied = false;
                for (const factorId of req.oneOf) {
                    if (completedClaims[factorId] !== undefined) {
                        satisfied = true;
                    }
                }
                if (!satisfied) {
                    for (const factorId of req.oneOf) {
                        nextFactors.add(factorId);
                    }
                }
            } else if ("allOf" in req) {
                for (const factorId of req.allOf) {
                    if (completedClaims[factorId] === undefined) {
                        nextFactors.add(factorId);
                    }
                }
            }
            if (nextFactors.size > 0) {
                return Array.from(nextFactors);
            }
        }
        return [];
    }
}
exports.MultiFactorAuthClaimClass = MultiFactorAuthClaimClass;
exports.MultiFactorAuthClaim = new MultiFactorAuthClaimClass();
