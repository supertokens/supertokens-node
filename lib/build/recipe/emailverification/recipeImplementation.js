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
class RecipeImplementation {
    constructor(querier) {
        this.createEmailVerificationToken = ({ userId, email }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token"),
                    {
                        userId,
                        email,
                    }
                );
                if (response.status === "OK") {
                    return {
                        status: "OK",
                        token: response.token,
                    };
                } else {
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    };
                }
            });
        this.verifyEmailUsingToken = ({ token }) =>
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
                        status: "OK",
                        user: {
                            id: response.userId,
                            email: response.email,
                        },
                    };
                } else {
                    return {
                        status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                    };
                }
            });
        this.isEmailVerified = ({ userId, email }) =>
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
        this.revokeEmailVerificationTokens = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token/remove"),
                    {
                        userId: input.userId,
                        email: input.email,
                    }
                );
                return { status: "OK" };
            });
        this.unverifyEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/remove"),
                    {
                        userId: input.userId,
                        email: input.email,
                    }
                );
                return { status: "OK" };
            });
        this.querier = querier;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
