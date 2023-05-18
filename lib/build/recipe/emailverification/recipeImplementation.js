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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const accountlinking_1 = __importDefault(require("../accountlinking"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
function getRecipeInterface(querier) {
    return {
        createEmailVerificationToken: function ({ recipeUserId, email }) {
            return __awaiter(this, void 0, void 0, function* () {
                // userId can be either recipeUserId or primaryUserId
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token"),
                    {
                        userId: recipeUserId.getAsString(),
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
        },
        getEmailVerificationTokenInfo: function ({ token }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/token"),
                    {
                        method: "token",
                        token,
                    }
                );
                return response;
            });
        },
        verifyEmailUsingToken: function ({ token, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify"),
                    {
                        method: "token",
                        token,
                    }
                );
                if (response.status === "OK") {
                    yield accountlinking_1.default.createPrimaryUserIdOrLinkAccounts({
                        recipeUserId: response.userId,
                        isVerified: true,
                        checkAccountsToLinkTableAsWell: true,
                        userContext,
                    });
                    return {
                        status: "OK",
                        user: {
                            recipeUserId: new recipeUserId_1.default(response.userId),
                            email: response.email,
                        },
                    };
                } else {
                    return {
                        status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                    };
                }
            });
        },
        isEmailVerified: function ({ recipeUserId, email }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify"),
                    {
                        userId: recipeUserId.getAsString(),
                        email,
                    }
                );
                return response.isVerified;
            });
        },
        revokeEmailVerificationTokens: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token/remove"),
                    {
                        userId: input.recipeUserId.getAsString(),
                        email: input.email,
                    }
                );
                return { status: "OK" };
            });
        },
        unverifyEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/email/verify/remove"), {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                });
                return { status: "OK" };
            });
        },
    };
}
exports.default = getRecipeInterface;
