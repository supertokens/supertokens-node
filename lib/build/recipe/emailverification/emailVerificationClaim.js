"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationClaim = exports.EmailVerificationClaimClass = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class EmailVerificationClaimClass extends claims_1.BooleanClaim {
    constructor() {
        super({
            key: "st-ev",
            async fetchValue(_userId, recipeUserId, __tenantId, _currentPayload, userContext) {
                const recipe = recipe_1.default.getInstanceOrThrowError();
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
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isVerified: (refetchTimeOnFalseInSeconds = 10, maxAgeInSeconds) =>
                Object.assign(Object.assign({}, this.validators.hasValue(true, maxAgeInSeconds)), {
                    shouldRefetch: (payload, userContext) => {
                        const value = this.getValueFromPayload(payload, userContext);
                        if (value === undefined) {
                            return true;
                        }
                        const currentTime = Date.now();
                        const lastRefetchTime = this.getLastRefetchTime(payload, userContext);
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
        });
    }
}
exports.EmailVerificationClaimClass = EmailVerificationClaimClass;
exports.EmailVerificationClaim = new EmailVerificationClaimClass();
