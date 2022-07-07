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
class EmailVerifiedClaimClass extends claims_1.BooleanClaim {
    constructor() {
        super({
            key: "st-ev",
            fetchValue(userId, userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    let email = yield recipe.getEmailForUserId(userId, userContext);
                    return recipe.recipeInterfaceImpl.isEmailVerified({ userId, email, userContext });
                });
            },
        });
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isValidated: (recheckDelayInSeconds = 10) => ({
                claim: this,
                id: "st-ev-isValidated",
                shouldRefetch: (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
                    return (
                        value === undefined ||
                        (value === false &&
                            this.getLastRefetchTime(payload, userContext) < Date.now() - recheckDelayInSeconds * 1000)
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
        });
    }
}
exports.EmailVerifiedClaimClass = EmailVerifiedClaimClass;
exports.EmailVerifiedClaim = new EmailVerifiedClaimClass();
