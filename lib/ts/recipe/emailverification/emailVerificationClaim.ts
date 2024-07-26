import EmailVerificationRecipe from "./recipe";
import { BooleanClaim } from "../session/claims";
import type { SessionClaimValidator } from "../session";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class EmailVerificationClaimClass extends BooleanClaim {
    constructor() {
        super({
            key: "st-ev",
            async fetchValue(_userId, recipeUserId, __tenantId, _currentPayload, userContext) {
                const recipe = EmailVerificationRecipe.getInstanceOrThrowError();
                let emailInfo = await recipe.getEmailForRecipeUserId(undefined, recipeUserId, userContext);

                if (emailInfo.status === "OK") {
                    return recipe.recipeInterfaceImpl.isEmailVerified({
                        recipeUserId,
                        email: emailInfo.email,
                        userContext,
                    });
                } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    // We consider people without email addresses as validated
                    return true;
                } else {
                    throw new Error("UNKNOWN_USER_ID");
                }
            },
        });

        this.validators = {
            ...this.validators,
            isVerified: (refetchTimeOnFalseInSeconds: number = 10, maxAgeInSeconds?: number) => ({
                ...this.validators.hasValue(true, maxAgeInSeconds),
                shouldRefetch: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);

                    if (value === undefined) {
                        return true;
                    }

                    const currentTime = Date.now();
                    const lastRefetchTime = this.getLastRefetchTime(payload, userContext)!;

                    if (maxAgeInSeconds !== undefined) {
                        if (lastRefetchTime < currentTime - maxAgeInSeconds * 1000) {
                            return true;
                        }
                    }

                    if (value === false) {
                        if (lastRefetchTime < currentTime - refetchTimeOnFalseInSeconds * 1000) {
                            return true;
                        }
                    }

                    return false;
                },
            }),
        };
    }

    declare validators: BooleanClaim["validators"] & {
        isVerified: (refetchTimeOnFalseInSeconds?: number, maxAgeInSeconds?: number) => SessionClaimValidator;
    };
}

export const EmailVerificationClaim = new EmailVerificationClaimClass();
