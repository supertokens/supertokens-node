import EmailVerificationRecipe from "./recipe";
import { BooleanClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";

export class EmailVerifiedClaimClass extends BooleanClaim {
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
            isValidated: (recheckDelayInSeconds: number = 10) => ({
                claim: this,
                id: "st-ev-isValidated",
                shouldRefetch: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
                    return (
                        value === undefined ||
                        (value === false &&
                            this.getLastRefetchTime(payload, userContext)! < Date.now() - recheckDelayInSeconds * 1000)
                    );
                },
                validate: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
                    return value === true
                        ? { isValid: true }
                        : {
                              isValid: false,
                              reason: { message: "wrong value", expectedValue: true, actualValue: value },
                          };
                },
            }),
        };
    }

    validators!: BooleanClaim["validators"] & {
        isValidated: (recheckDelayInSeconds?: number) => SessionClaimValidator;
    };
}

export const EmailVerifiedClaim = new EmailVerifiedClaimClass();
