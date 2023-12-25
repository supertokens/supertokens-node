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

                    const { n } = claimVal;

                    if (n.length === 0) {
                        return {
                            isValid: true,
                        };
                    }

                    return {
                        isValid: false,
                        reason: {
                            message: "not all required factors have been completed",
                            nextFactorOptions: n,
                        },
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
                        } else if (typeof req === "object" && "allOf" in req) {
                            const res = req.allOf
                                .map((r) => checkFactorRequirement(r, c))
                                .filter((v) => v.isValid === false);
                            if (res.length !== 0) {
                                return {
                                    isValid: false,
                                    reason: {
                                        message: "Some factor checkers failed in the list",
                                        allOf: req.allOf,
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
            tenantId: tenantId ?? DEFAULT_TENANT_ID,
            userContext,
        });

        // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
        const requiredSecondaryFactorsForUser = await recipeInstance.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser(
            {
                userId,
                userContext,
            }
        );
        const completedFactorsClaimValue = currentPayload && (currentPayload[this.key] as JSONObject);
        const completedFactors: Record<string, number> =
            (completedFactorsClaimValue?.c as Record<string, number>) ?? {};
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
            n: MultiFactorAuthClaim.buildNextArray(completedFactors, mfaRequirementsForAuth),
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
