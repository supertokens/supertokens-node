import RecipeUserId from "../../recipeUserId";
import { SessionClaimValidator } from "../session";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import { MFAClaimValue, MFARequirementList } from "./types";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    constructor(key?: string) {
        super(key ?? "st-mfa");

        this.validators = {
            passesMFARequirements: (requirements?: MFARequirementList, id?: string) => ({
                claim: this,
                id: id ?? this.key,
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
                                message: "no factors are complete in the session",
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
                                        message: `the factorId ${req} is not complete in the session`,
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
                                        message: `none of these factorIds [${req.oneOf.join(
                                            ", "
                                        )}] are complete session`,
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
                                            message: `the factor ${factorId} is not complete in session, all of these factorIds [${req.allOf.join(
                                                ", "
                                            )}] must be complete in session`,
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

    public validators: {
        passesMFARequirements: (requirements?: MFARequirementList, id?: string) => SessionClaimValidator;
    };

    public buildNextArray(completedClaims: MFAClaimValue["c"], requirements: MFARequirementList): string[] {
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

    public fetchValue = (
        _userId: string,
        _recipeUserId: RecipeUserId,
        _tenantId: string | undefined,
        _userContext: any
    ) => {
        // Nothing to fetch, the values are populated on
        // completion of authentication steps
        return {
            c: {},
            n: [],
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
                n: value.n,
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
