"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class EmailVerificationClaimClass extends claims_1.BooleanClaim {
    constructor() {
        super({
            key: "st-ev",
            fetchValue(userId, userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    let emailInfo = yield recipe.getEmailForUserId(userId, userContext);
                    if (emailInfo.status === "OK") {
                        return recipe.recipeInterfaceImpl.isEmailVerified({
                            userId,
                            email: emailInfo.email,
                            userContext,
                        });
                    } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                        // We consider people without email addresses as validated
                        return true;
                    } else {
                        throw new Error("UNKNOWN_USER_ID");
                    }
                });
            },
            defaultMaxAgeInSeconds: 300,
        });
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isVerified: (refetchTimeOnFalseInSeconds = 10, maxAgeInSeconds = 300) =>
                Object.assign(Object.assign({}, this.validators.hasValue(true, maxAgeInSeconds)), {
                    shouldRefetch: (payload, userContext) => {
                        const value = this.getValueFromPayload(payload, userContext);
                        return (
                            value === undefined ||
                            this.getLastRefetchTime(payload, userContext) < Date.now() - maxAgeInSeconds * 1000 ||
                            (value === false &&
                                this.getLastRefetchTime(payload, userContext) <
                                    Date.now() - refetchTimeOnFalseInSeconds * 1000)
                        );
                    },
                }),
        });
    }
}
exports.EmailVerificationClaimClass = EmailVerificationClaimClass;
exports.EmailVerificationClaim = new EmailVerificationClaimClass();
