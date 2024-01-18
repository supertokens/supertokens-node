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
        this.fetchValue = async (userId, _recipeUserId, tenantId, currentPayload, userContext) => {
            const mfaInfo = await utils_1.getMFARelatedInfoFromSession({
                userId,
                tenantId,
                accessTokenPayload: currentPayload,
                assumeEmptyCompletedIfNotFound: true,
                userContext,
            });
            if (mfaInfo.status === "OK") {
                let { completedFactors, mfaRequirementsForAuth } = mfaInfo;
                return {
                    c: completedFactors,
                    v:
                        this.getNextSetOfUnsatisfiedFactors(completedFactors, mfaRequirementsForAuth).factorIds
                            .length === 0,
                };
            } else if (mfaInfo.status === "MFA_CLAIM_VALUE_NOT_FOUND_ERROR") {
                throw new Error("should never happen");
            } else if (mfaInfo.status === "SESSION_USER_NOT_FOUND_ERROR") {
                throw new Error("Unknown User ID provided");
            } else if (mfaInfo.status === "TENANT_NOT_FOUND_ERROR") {
                throw new Error("Tenant not found");
            } else {
                throw new Error("should never come here");
            }
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
        this.removeFromPayloadByMerge_internal = () => {
            return {
                [this.key]: null,
            };
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
                    const unsatisfiedFactors = this.getNextSetOfUnsatisfiedFactors(completedFactors, requirementList);
                    if (unsatisfiedFactors.factorIds.length === 0) {
                        return {
                            isValid: true,
                        };
                    }
                    if (unsatisfiedFactors.type === "string") {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "Factor validation failed: " + unsatisfiedFactors.factorIds[0] + " not completed",
                                factorId: unsatisfiedFactors.factorIds[0],
                            },
                        };
                    } else if (unsatisfiedFactors.type === "oneOf") {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "None of these factors are complete in the session: " +
                                    unsatisfiedFactors.factorIds.join(", "),
                                oneOf: unsatisfiedFactors.factorIds,
                            },
                        };
                    } else {
                        return {
                            isValid: false,
                            reason: {
                                message:
                                    "Some of the factors are not complete in the session: " +
                                    unsatisfiedFactors.factorIds.join(", "),
                                allOfInAnyOrder: unsatisfiedFactors.factorIds,
                            },
                        };
                    }
                },
            }),
        };
    }
    getNextSetOfUnsatisfiedFactors(completedFactors, requirementList) {
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
