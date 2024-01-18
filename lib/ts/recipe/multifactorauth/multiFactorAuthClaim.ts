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

import RecipeUserId from "../../recipeUserId";
import { SessionClaimValidator } from "../session";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import { MFAClaimValue, MFARequirementList } from "./types";
import { UserContext } from "../../types";
import { getMFARelatedInfoFromSession } from "./utils";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    constructor(key?: string) {
        super(key ?? "st-mfa");

        this.validators = {
            hasCompletedMFARequirementsForAuth: (claimKey?: string) => ({
                claim: this,
                id: claimKey ?? this.key,

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

            hasCompletedRequirementList: (requirementList: MFARequirementList, claimKey?: string) => ({
                claim: this,
                id: claimKey ?? this.key,

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

    public validators: {
        hasCompletedMFARequirementsForAuth: (id?: string) => SessionClaimValidator;
        hasCompletedRequirementList(requirementList: MFARequirementList, id?: string): SessionClaimValidator;
    };

    public getNextSetOfUnsatisfiedFactors(
        completedFactors: MFAClaimValue["c"],
        requirementList: MFARequirementList
    ): { factorIds: string[]; type: "string" | "oneOf" | "allOfInAnyOrder" } {
        // This function checks each of the requrement one by one and returns the list of unsatisfied factors
        // from the item which is not satisfied.
        // For example:
        //   1. if requirementList is ["f1", { oneOf: ["f2", "f3"] }, "f4"] and user has completed f1, this functions returns ["f2", "f3"]
        //   2. if requirementList is ["f1", { allOfInAnyOrder: ["f2", "f3"] }, "f4"] and user has completed f1, f2, this functions returns the group ["f2", "f3"]
        //   3. if requirementList is [ oneOf: ["f1", "f2"], allofInAnyOrder: ["f3", "f4"], "f5" ] and user has completed f1, f3, this functions returns the group ["f3", "f4"] since that's the first group of factors which is not satisfied

        for (const req of requirementList) {
            const nextFactors: Set<string> = new Set();
            let type: "string" | "oneOf" | "allOfInAnyOrder" = "string";

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

    public fetchValue = async (
        userId: string,
        _recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => {
        const mfaInfo = await getMFARelatedInfoFromSession({
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
                v: this.getNextSetOfUnsatisfiedFactors(completedFactors, mfaRequirementsForAuth).factorIds.length === 0,
            };
        } else if (mfaInfo.status === "MFA_CLAIM_VALUE_NOT_FOUND_ERROR") {
            throw new Error("should never happen"); // because we assume missing claim value as empty completed factors in the function `getMFARelatedInfoFromSession`
        } else if (mfaInfo.status === "SESSION_USER_NOT_FOUND_ERROR") {
            throw new Error("Unknown User ID provided");
        } else if (mfaInfo.status === "TENANT_NOT_FOUND_ERROR") {
            throw new Error("Tenant not found");
        } else {
            throw new Error("should never come here");
        }
    };

    public addToPayload_internal = (payload: JSONObject, value: MFAClaimValue) => {
        const prevValue = payload[this.key] as MFAClaimValue | undefined;
        return {
            ...payload,
            [this.key]: {
                c: {
                    ...prevValue?.c,
                    ...value.c,
                },
                v: value.v,
            },
        };
    };

    public removeFromPayload = (payload: JSONObject) => {
        const retVal = {
            ...payload,
        };
        delete retVal[this.key];

        return retVal;
    };

    public removeFromPayloadByMerge_internal = () => {
        return {
            [this.key]: null,
        };
    };

    public getValueFromPayload = (payload: JSONObject) => {
        return payload[this.key] as MFAClaimValue;
    };
}

export const MultiFactorAuthClaim = new MultiFactorAuthClaimClass();
