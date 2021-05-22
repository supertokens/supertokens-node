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
const normalisedURLPath_1 = require("../../normalisedURLPath");
const error_1 = require("./error");
class RecipeImplementation {
    constructor(querier) {
        this.createEmailVerificationToken = (userId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token"),
                    {
                        userId,
                        email,
                    }
                );
                if (response.status === "OK") {
                    return response.token;
                } else {
                    throw new error_1.default({
                        type: error_1.default.EMAIL_ALREADY_VERIFIED_ERROR,
                        message: "Failed to generated email verification token as the email is already verified",
                    });
                }
            });
        this.verifyEmailUsingToken = (token) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify"),
                    {
                        method: "token",
                        token,
                    }
                );
                if (response.status === "OK") {
                    return {
                        id: response.userId,
                        email: response.email,
                    };
                } else {
                    throw new error_1.default({
                        type: error_1.default.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR,
                        message: "Failed to verify email as the the token has expired or is invalid",
                    });
                }
            });
        this.isEmailVerified = (userId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify"),
                    {
                        userId,
                        email,
                    }
                );
                return response.isVerified;
            });
        this.querier = querier;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
