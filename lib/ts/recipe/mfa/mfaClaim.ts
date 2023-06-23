import { SessionClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";

interface MfaClaimValue {
    c: {
        [factorId: string]: number; // timeCompleted
    };
    next?: string[];
}

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class MfaClaimClass extends SessionClaim<MfaClaimValue> {
    public readonly fetchValue: SessionClaim<MfaClaimValue>["fetchValue"];

    constructor() {
        super("st-mfa");
        this.fetchValue = async (_userId, _recipeUserId, _currentAccessTokenPayload, _userContext) => {
            // TODO: Should take defaultFirstFactors from config?
            return { c: {}, next: [] };
        };
    }

    validators = {
        hasCompletedFactors: (factorIds: string[] = []): SessionClaimValidator => ({
            id: this.key,
            validate: async (_payload, _userContext) => {
                let claimValue = await this.getValueFromPayload(_payload, _userContext);
                if (claimValue === undefined) return { isValid: true }; // If claim is not present, then it is valid

                let incompleteRequiredFactors: string[] = [];
                if (factorIds.length === 0) {
                    // Check all factors
                    incompleteRequiredFactors = claimValue.next ?? [];
                } else {
                    // Check specific factors
                    let completedFactors = new Set(Object.keys(claimValue?.c ?? {}));
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
            },
        }),
        hasCompletedFactorWithinTime: (_factorId: string, _timeInSec: number): SessionClaimValidator => ({
            id: this.key,
            validate: async (_payload, _userContext) => {
                let claimValue = await this.getValueFromPayload(_payload, _userContext);
                if (claimValue === undefined) return { isValid: true }; // If claim is not present, then it is valid

                const factorCompletedAt = claimValue.c[_factorId] ?? 0;
                const currentTime = new Date().getTime(); // TODO: Test for timezone issues?
                const isValid = currentTime - factorCompletedAt < _timeInSec * 1000;
                if (isValid) {
                    return { isValid: true };
                } else {
                    return {
                        isValid: false,
                        reason: { message: "Need to complete one of the required factors", choices: [_factorId] },
                    };
                }
            },
        }),
    };

    addToPayload_internal(payload: any, value: MfaClaimValue, _userContext: any): any {
        return {
            ...payload,
            [this.key]: value,
        };
    }

    removeFromPayloadByMerge_internal(payload: any, _userContext?: any): any {
        const res = {
            ...payload,
            [this.key]: null,
        };

        return res;
    }

    removeFromPayload(payload: any, _userContext?: any): any {
        const res = {
            ...payload,
        };
        delete res[this.key];

        return res;
    }

    getValueFromPayload(payload: any, _userContext?: any): MfaClaimValue | undefined {
        return payload[this.key];
    }
}

export const MfaClaim = new MfaClaimClass();
