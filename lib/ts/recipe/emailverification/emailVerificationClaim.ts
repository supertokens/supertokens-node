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
            async fetchValue(userId, userContext) {
                const recipe = EmailVerificationRecipe.getInstanceOrThrowError();
                let email = await recipe.getEmailForUserId(userId, userContext);
                return recipe.recipeInterfaceImpl.isEmailVerified({ userId, email, userContext });
            },
        });

        this.validators = {
            ...this.validators,
            isVerified: (refetchTimeOnFalseInSeconds: number = 10) => ({
                ...this.validators.hasValue(true, "st-ev-isVerified"),
                shouldRefetch: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
                    return (
                        value === undefined ||
                        (value === false &&
                            this.getLastRefetchTime(payload, userContext)! <
                                Date.now() - refetchTimeOnFalseInSeconds * 1000)
                    );
                },
            }),
        };
    }

    validators!: BooleanClaim["validators"] & {
        isVerified: (refetchTimeOnFalseInSeconds?: number) => SessionClaimValidator;
    };
}

export const EmailVerificationClaim = new EmailVerificationClaimClass();
