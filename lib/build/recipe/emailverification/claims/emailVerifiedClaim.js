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
const claims_1 = require("../../session/claims");
class EmailVerifiedClaim extends claims_1.BooleanClaim {
    constructor(recipeInstance) {
        super({
            key: "st-ev",
            fetchValue: (userId, userContext) =>
                __awaiter(this, void 0, void 0, function* () {
                    // TODO: support multiple auth recipes & split out EmailVerified recipe
                    try {
                        const email = yield recipeInstance.config.getEmailForUserId(userId, userContext);
                        return recipeInstance.recipeInterfaceImpl.isEmailVerified({ userId, email, userContext });
                    } catch (_a) {
                        return undefined;
                    }
                }),
        });
    }
}
exports.EmailVerifiedClaim = EmailVerifiedClaim;
