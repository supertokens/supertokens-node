import EmailVerificationRecipe from "./recipe";
import { BooleanClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class EmailVerificationClaimClass extends BooleanClaim {
    constructor() {
        super({
            key: "st-ev",
            async fetchValue(_userId, recipeUserId, _currentAccessTokenPayload, userContext) {
                const recipe = EmailVerificationRecipe.getInstanceOrThrowError();
                let emailInfo = await recipe.getEmailForRecipeUserId(recipeUserId, userContext);

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
            defaultMaxAgeInSeconds: 300,
        });

        this.validators = {
            ...this.validators,
            isVerified: (refetchTimeOnFalseInSeconds: number = 10, maxAgeInSeconds: number = 300) => ({
                ...this.validators.hasValue(true, maxAgeInSeconds),
                shouldRefetch: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
                    return (
                        value === undefined ||
                        this.getLastRefetchTime(payload, userContext)! < Date.now() - maxAgeInSeconds * 1000 ||
                        (value === false &&
                            this.getLastRefetchTime(payload, userContext)! <
                                Date.now() - refetchTimeOnFalseInSeconds * 1000)
                    );
                },
            }),
        };
    }

    validators!: BooleanClaim["validators"] & {
        isVerified: (refetchTimeOnFalseInSeconds?: number, maxAgeInSeconds?: number) => SessionClaimValidator;
    };
}

export const EmailVerificationClaim = new EmailVerificationClaimClass();
