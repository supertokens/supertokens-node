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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFactorAuthClaim = exports.MultiFactorAuthClaimClass = void 0;
const claims_1 = require("../session/claims");
const utils_1 = require("./utils");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class MultiFactorAuthClaimClass extends claims_1.SessionClaim {
    constructor(key) {
        super(key !== null && key !== void 0 ? key : "st-mfa");
        this.fetchValue = async (_userId, recipeUserId, tenantId, currentPayload, userContext) => {
            const mfaInfo = await (0, utils_1.updateAndGetMFARelatedInfoInSession)({
                sessionRecipeUserId: recipeUserId,
                tenantId,
                accessTokenPayload: currentPayload,
                userContext,
            });
            let { completedFactors, isMFARequirementsForAuthSatisfied } = mfaInfo;
            return {
                c: completedFactors,
                v: isMFARequirementsForAuthSatisfied,
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
                    v: value.v,
                },
            });
        };
        this.removeFromPayload = (payload) => {
            const retVal = Object.assign({}, payload);
            delete retVal[this.key];
            return retVal;
        };
        this.removeFromPayloadByMerge_internal = (payload) => {
            return Object.assign(Object.assign({}, payload), { [this.key]: null });
        };
        this.getValueFromPayload = (payload) => {
            return payload[this.key];
        };
        this.validators = {
            hasCompletedMFARequirementsForAuth: (claimKey) => ({
                claim: this,
                id: claimKey !== null && claimKey !== void 0 ? claimKey : this.key,
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
                        reason:
                            v === false
                                ? {
                                      message: "MFA requirement for auth is not satisfied",
                                  }
                                : undefined,
                    };
                },
            }),
            hasCompletedRequirementList: (requirementList, claimKey) => ({
                claim: this,
                id: claimKey !== null && claimKey !== void 0 ? claimKey : this.key,
                shouldRefetch: (payload) => {
                    const value = this.getValueFromPayload(payload);
                    return value === undefined;
                },
                validate: async (payload) => {
                    if (requirementList.length === 0) {
                        return {
                            isValid: true, // No requirements to satisfy
                        };
                    }
                    const claimVal = this.getValueFromPayload(payload);
                    if (claimVal === undefined) {
                        throw new Error("This should never happen, claim value not present in payload");
                    }
                    const { c: completedFactors } = claimVal;
                    const nextSetOfUnsatisfiedFactors = this.getNextSetOfUnsatisfiedFactors(
                        completedFactors,
                        requirementList
                    );
                    if (nextSetOfUnsatisfiedFactors.factorIds.length === 0) {
                        // No item in the requirementList is left unsatisfied, hence is Valid
                        return {
                            isValid: true,
                        };
                    }
                    if (nextSetOfUnsatisfiedFactors.type === "string") {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "Factor validation failed: " +
                                    nextSetOfUnsatisfiedFactors.factorIds[0] +
                                    " not completed",
                                factorId: nextSetOfUnsatisfiedFactors.factorIds[0],
                            },
                        };
                    } else if (nextSetOfUnsatisfiedFactors.type === "oneOf") {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "None of these factors are complete in the session: " +
                                    nextSetOfUnsatisfiedFactors.factorIds.join(", "),
                                oneOf: nextSetOfUnsatisfiedFactors.factorIds,
                            },
                        };
                    } else {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "Some of the factors are not complete in the session: " +
                                    nextSetOfUnsatisfiedFactors.factorIds.join(", "),
                                allOfInAnyOrder: nextSetOfUnsatisfiedFactors.factorIds,
                            },
                        };
                    }
                },
            }),
        };
    }
    getNextSetOfUnsatisfiedFactors(completedFactors, requirementList) {
        // This function checks each of the requrement one by one and returns the list of unsatisfied factors
        // from the item which is not satisfied.
        // For example:
        //   1. if requirementList is ["f1", { oneOf: ["f2", "f3"] }, "f4"] and user has completed f1, this functions returns ["f2", "f3"]
        //   2. if requirementList is ["f1", { allOfInAnyOrder: ["f2", "f3"] }, "f4"] and user has completed f1, f2, this functions returns the group ["f2", "f3"]
        //   3. if requirementList is [ oneOf: ["f1", "f2"], allofInAnyOrder: ["f3", "f4"], "f5" ] and user has completed f1, f3, this functions returns the group ["f3", "f4"] since that's the first group of factors which is not satisfied
        for (const req of requirementList) {
            const nextFactors = new Set();
            let type = "string";
            if (typeof req === "string") {
                if (completedFactors[req] === undefined) {
                    type = "string";
                    nextFactors.add(req);
                }
            } else if ("oneOf" in req) {
                let satisfied = false;
                for (const factorId of req.oneOf) {
                    if (completedFactors[factorId] !== undefined) {
                        satisfied = true;
                    }
                }
                if (!satisfied) {
                    type = "oneOf";
                    for (const factorId of req.oneOf) {
                        nextFactors.add(factorId);
                    }
                }
            } else if ("allOfInAnyOrder" in req) {
                for (const factorId of req.allOfInAnyOrder) {
                    type = "allOfInAnyOrder";
                    if (completedFactors[factorId] === undefined) {
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
            type: "string",
        };
    }
}
exports.MultiFactorAuthClaimClass = MultiFactorAuthClaimClass;
exports.MultiFactorAuthClaim = new MultiFactorAuthClaimClass();
