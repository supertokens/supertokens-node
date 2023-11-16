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

    public validators: {
        passesMFARequirements: (requirements?: MFARequirementList, id?: string) => SessionClaimValidator;
    };

    public buildNextArray(completedClaims: MFAClaimValue["c"], requirements: MFARequirementList): string[] {
        for (const req of requirements) {
            const nextArray: Set<string> = new Set();

            if (typeof req === "string") {
                if (completedClaims[req] === undefined) {
                    nextArray.add(req);
                }
            } else if ("oneOf" in req) {
                let satisfied = false;
                for (const factorId of req.oneOf) {
                    if (completedClaims[factorId] !== undefined) {
                        satisfied = true;
                        break;
                    }
                }
                if (!satisfied) {
                    for (const factorId of req.oneOf) {
                        nextArray.add(factorId);
                    }
                }
            } else if ("allOf" in req) {
                for (const factorId in req.allOf) {
                    if (completedClaims[factorId] === undefined) {
                        nextArray.add(factorId);
                    }
                }
            }

            if (nextArray.size > 0) {
                [...nextArray];
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
