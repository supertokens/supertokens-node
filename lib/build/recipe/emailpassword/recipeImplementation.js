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
        this.signUp = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    throw new error_1.default({
                        message: "Sign up failed because the email, " + email + ", is already taken",
                        type: error_1.default.EMAIL_ALREADY_EXISTS_ERROR,
                    });
                }
            });
        this.signIn = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    throw new error_1.default({
                        message: "Sign in failed because of incorrect email & password combination",
                        type: error_1.default.WRONG_CREDENTIALS_ERROR,
                    });
                }
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        this.getUserByEmail = (email) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    email,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        this.createResetPasswordToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
                    {
                        userId,
                    }
                );
                if (response.status === "OK") {
                    return response.token;
                } else {
                    throw new error_1.default({
                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                        message: "Failed to generated password reset token as the user ID is unknown",
                    });
                }
            });
        this.resetPasswordUsingToken = (token, newPassword) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset"),
                    {
                        method: "token",
                        token,
                        newPassword,
                    }
                );
                if (response.status !== "OK") {
                    throw new error_1.default({
                        type: error_1.default.RESET_PASSWORD_INVALID_TOKEN_ERROR,
                        message: "Failed to reset password as the the token has expired or is invalid",
                    });
                }
            });
        this.getUsersOldestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.getUsers("ASC", limit, nextPaginationToken);
            });
        this.getUsersNewestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.getUsers("DESC", limit, nextPaginationToken);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/users/count"),
                    {}
                );
                return Number(response.count);
            });
        this.getUsers = (timeJoinedOrder, limit, paginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/users"), {
                    timeJoinedOrder,
                    limit,
                    paginationToken,
                });
                return {
                    users: response.users,
                    nextPaginationToken: response.nextPaginationToken,
                };
            });
        this.querier = querier;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
