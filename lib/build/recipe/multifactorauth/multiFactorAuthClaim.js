"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFactorAuthClaim = exports.MultiFactorAuthClaimClass = void 0;
const __1 = require("../..");
const claims_1 = require("../session/claims");
const multitenancy_1 = __importDefault(require("../multitenancy"));
const recipe_1 = __importDefault(require("./recipe"));
const constants_1 = require("../multitenancy/constants");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class MultiFactorAuthClaimClass extends claims_1.SessionClaim {
    constructor(key) {
        super(key !== null && key !== void 0 ? key : "st-mfa");
        this.fetchValue = async (userId, _recipeUserId, tenantId, currentPayload, userContext) => {
            var _a, _b;
            const user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                throw new Error("Unknown User ID provided");
            }
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId !== null && tenantId !== void 0 ? tenantId : constants_1.DEFAULT_TENANT_ID, userContext);
            if (tenantInfo === undefined) {
                throw new Error("should never happen");
            }
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            const isAlreadySetup = await recipeInstance.recipeInterfaceImpl.getFactorsSetupForUser({
                tenantId,
                user,
                userContext,
            });
            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const requiredSecondaryFactorsForUser = await recipeInstance.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                userId,
                userContext,
            });
            const completedFactorsClaimValue = currentPayload === undefined ? undefined : currentPayload[this.key];
            // if completedClaims is undefined, we can assume that no factors are completed
            // this can happen when an old session is migrated with MFA claim and we don't know what was the first factor
            // it is okay to assume no factors are completed at this stage because the MFA requirements are generally about
            // the second factors. In the worst case, the user will be asked to do the factor again, which should be okay.
            const completedFactors = (_a = completedFactorsClaimValue === null || completedFactorsClaimValue === void 0 ? void 0 : completedFactorsClaimValue.c) !== null && _a !== void 0 ? _a : {};
            const mfaRequirementsForAuth = await recipeInstance.recipeInterfaceImpl.getMFARequirementsForAuth({
                user,
                accessTokenPayload: currentPayload !== undefined ? currentPayload : {},
                tenantId: tenantId !== null && tenantId !== void 0 ? tenantId : constants_1.DEFAULT_TENANT_ID,
                factorsSetUpForUser: isAlreadySetup,
                requiredSecondaryFactorsForTenant: (_b = tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [],
                requiredSecondaryFactorsForUser,
                completedFactors: completedFactors,
                userContext,
            });
            return {
                c: completedFactors,
                v: exports.MultiFactorAuthClaim.isRequirementListSatisfied(completedFactors, mfaRequirementsForAuth),
            };
        };
        this.addToPayload_internal = (payload, value) => {
            const prevValue = payload[this.key];
            return Object.assign(Object.assign({}, payload), { [this.key]: {
                    c: Object.assign(Object.assign({}, prevValue === null || prevValue === void 0 ? void 0 : prevValue.c), value.c),
                    v: value.v,
                } });
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
            hasCompletedMFARequirementForAuth: (id) => ({
                claim: this,
                id: id !== null && id !== void 0 ? id : this.key,
                shouldRefetch: (payload) => {
                    const value = this.getValueFromPayload(payload);
                    return value === undefined;
                },
                validate: async (payload) => {
                    const claimVal = this.getValueFromPayload(payload);
                    if (claimVal === undefined) {
                        throw new Error("This should never happen, claim value not present in payload");
                    }
                    const { v } = claimVal;
                    return {
                        isValid: v,
                        reason: v === false
                            ? {
                                message: "MFA requirement for auth is not satisfied",
                            }
                            : undefined,
                    };
                },
            }),
            hasCompletedFactors: (requirements, id) => ({
                claim: this,
                id: id !== null && id !== void 0 ? id : this.key,
                shouldRefetch: (payload) => {
                    const value = this.getValueFromPayload(payload);
                    return value === undefined;
                },
                validate: async (payload) => {
                    if (requirements.length === 0) {
                        return {
                            isValid: true, // No requirements to satisfy
                        };
                    }
                    const claimVal = this.getValueFromPayload(payload);
                    if (claimVal === undefined) {
                        throw new Error("This should never happen, claim value not present in payload");
                    }
                    const { c } = claimVal;
                    const unsatisfiedFactors = this.getNextSetOfUnsatisfiedFactors(c, requirements);
                    if (unsatisfiedFactors.factorIds.length === 0) {
                        return {
                            isValid: true,
                        };
                    }
                    if (unsatisfiedFactors.type === "requirement") {
                        return {
                            isValid: false,
                            reason: {
                                message: "Factor validation failed: " + unsatisfiedFactors.factorIds[0] + " not completed",
                                factorId: unsatisfiedFactors.factorIds[0],
                            },
                        };
                    }
                    else if (unsatisfiedFactors.type === "oneOf") {
                        return {
                            isValid: false,
                            reason: {
                                message: "All factor checkers failed in the list",
                                oneOf: unsatisfiedFactors.factorIds,
                            },
                        };
                    }
                    else {
                        return {
                            isValid: false,
                            reason: {
                                message: "Some factor checkers failed in the list",
                                allOfInAnyOrder: unsatisfiedFactors.factorIds,
                            },
                        };
                    }
                },
            }),
        };
    }
    isRequirementListSatisfied(completedClaims, requirements) {
        return this.getNextSetOfUnsatisfiedFactors(completedClaims, requirements).factorIds.length === 0;
    }
    getNextSetOfUnsatisfiedFactors(completedClaims, requirements) {
        if (completedClaims === undefined) {
            // if completedClaims is undefined, we can assume that no factors are completed
            // this can happen when an old session is migrated with MFA claim and we don't know what was the first factor
            // it is okay to assume no factors are completed at this stage because the MFA requirements are generally about
            // the second factors. In the worst case, the user will be asked to do the factor again, which should be okay.
            completedClaims = {};
        }
        for (const req of requirements) {
            const nextFactors = new Set();
            let type = "requirement";
            if (typeof req === "string") {
                if (completedClaims[req] === undefined) {
                    type = "requirement";
                    nextFactors.add(req);
                }
            }
            else if ("oneOf" in req) {
                let satisfied = false;
                for (const factorId of req.oneOf) {
                    if (completedClaims[factorId] !== undefined) {
                        satisfied = true;
                    }
                }
                if (!satisfied) {
                    type = "oneOf";
                    for (const factorId of req.oneOf) {
                        nextFactors.add(factorId);
                    }
                }
            }
            else if ("allOfInAnyOrder" in req) {
                for (const factorId of req.allOfInAnyOrder) {
                    type = "allOfInAnyOrder";
                    if (completedClaims[factorId] === undefined) {
                        nextFactors.add(factorId);
                    }
                }
            }
            if (nextFactors.size > 0) {
                return {
                    factorIds: Array.from(nextFactors),
                    type: type,
                };
            }
        }
        return {
            factorIds: [],
            type: "requirement",
        };
    }
}
exports.MultiFactorAuthClaimClass = MultiFactorAuthClaimClass;
exports.MultiFactorAuthClaim = new MultiFactorAuthClaimClass();
