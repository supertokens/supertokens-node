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

import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { SessionClaimValidator } from "../session";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import { MFAClaimValue, MFARequirementList } from "./types";
import Multitenancy from "../multitenancy";
import MultiFactorAuthRecipe from "./recipe";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { checkFactorRequirement } from "./utils";
import { UserContext } from "../../types";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    constructor(key?: string) {
        super(key ?? "st-mfa");

        this.validators = {
            hasCompletedMFARequirementForAuth: (id?: string) => ({
                claim: this,
                id: id ?? this.key,

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

            hasCompletedFactors: (requirements: MFARequirementList, id?: string) => ({
                claim: this,
                id: id ?? this.key,

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

                    for (const req of requirements) {
                        if (typeof req === "object" && "oneOf" in req) {
                            const res = req.oneOf
                                .map((r) => checkFactorRequirement(r, c))
                                .filter((v) => v.isValid === false);
                            if (res.length === req.oneOf.length) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: "All factor checkers failed in the list",
                                        oneOf: req.oneOf,
                                        failures: res,
                                    },
                                };
                            }
                        } else if (typeof req === "object" && "allOfInAnyOrder" in req) {
                            const res = req.allOfInAnyOrder
                                .map((r) => checkFactorRequirement(r, c))
                                .filter((v) => v.isValid === false);
                            if (res.length !== 0) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: "Some factor checkers failed in the list",
                                        allOfInAnyOrder: req.allOfInAnyOrder,
                                        failures: res,
                                    },
                                };
                            }
                        } else {
                            const res = checkFactorRequirement(req, c);
                            if (res.isValid !== true) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: "Factor validation failed: " + res.message,
                                        factorId: res.id,
                                    },
                                };
                            }
                        }
                    }

                    return {
                        isValid: true,
                    };
                },
            }),
        };
    }

    public validators: {
        hasCompletedMFARequirementForAuth: (id?: string) => SessionClaimValidator;
        hasCompletedFactors(requirements: MFARequirementList, id?: string): SessionClaimValidator;
    };

    public isRequirementListSatisfied(completedClaims: MFAClaimValue["c"], requirements: MFARequirementList): boolean {
        return this.getNextSetOfUnsatisfiedFactors(completedClaims, requirements).length === 0;
    }

    public getNextSetOfUnsatisfiedFactors(
        completedClaims: MFAClaimValue["c"],
        requirements: MFARequirementList
    ): string[] {
        if (completedClaims === undefined) {
            // if completedClaims is undefined, we can assume that no factors are completed
            // this can happen when an old session is migrated with MFA claim and we don't know what was the first factor
            // it is okay to assume no factors are completed at this stage because the MFA requirements are generally about
            // the second factors. In the worst case, the user will be asked to do the factor again, which should be okay.
            completedClaims = {};
        }

        for (const req of requirements) {
            const nextFactors: Set<string> = new Set();

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
            } else if ("allOfInAnyOrder" in req) {
                for (const factorId of req.allOfInAnyOrder) {
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

    public fetchValue = async (
        userId: string,
        _recipeUserId: RecipeUserId,
        tenantId: string | undefined,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => {
        const user = await getUser(userId, userContext);

        if (user === undefined) {
            throw new Error("Unknown User ID provided");
        }
        const tenantInfo = await Multitenancy.getTenant(tenantId ?? DEFAULT_TENANT_ID, userContext);

        if (tenantInfo === undefined) {
            throw new Error("should never happen");
        }

        const recipeInstance = MultiFactorAuthRecipe.getInstanceOrThrowError();
        const isAlreadySetup = await recipeInstance.recipeInterfaceImpl.getFactorsSetupForUser({
            user,
            userContext,
        });

        // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
        const requiredSecondaryFactorsForUser = await recipeInstance.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser(
            {
                userId,
                userContext,
            }
        );
        const completedFactorsClaimValue =
            currentPayload === undefined ? undefined : (currentPayload[this.key] as JSONObject);

        // if completedClaims is undefined, we can assume that no factors are completed
        // this can happen when an old session is migrated with MFA claim and we don't know what was the first factor
        // it is okay to assume no factors are completed at this stage because the MFA requirements are generally about
        // the second factors. In the worst case, the user will be asked to do the factor again, which should be okay.
        const completedFactors: Record<string, number> =
            (completedFactorsClaimValue?.c as Record<string, number> | undefined) ?? {};

        const mfaRequirementsForAuth = await recipeInstance.recipeInterfaceImpl.getMFARequirementsForAuth({
            user,
            accessTokenPayload: currentPayload !== undefined ? currentPayload : {},
            tenantId: tenantId ?? DEFAULT_TENANT_ID,
            factorsSetUpForUser: isAlreadySetup,
            requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
            requiredSecondaryFactorsForUser,
            completedFactors: completedFactors,
            userContext,
        });

        return {
            c: completedFactors,
            v: MultiFactorAuthClaim.isRequirementListSatisfied(completedFactors, mfaRequirementsForAuth),
        };
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
