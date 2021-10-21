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
        this.signUp = ({ email, password }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    return response;
                } else {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            });
        this.signIn = ({ email, password }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    return response;
                } else {
                    return {
                        status: "WRONG_CREDENTIALS_ERROR",
                    };
                }
            });
        this.getUserById = ({ userId }) =>
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
        this.getUserByEmail = ({ email }) =>
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
        this.createResetPasswordToken = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
                    {
                        userId,
                    }
                );
                if (response.status === "OK") {
                    return {
                        status: "OK",
                        token: response.token,
                    };
                } else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        this.resetPasswordUsingToken = ({ token, newPassword }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset"),
                    {
                        method: "token",
                        token,
                        newPassword,
                    }
                );
                return response;
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
        this.updateEmailOrPassword = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: input.userId,
                    email: input.email,
                    password: input.password,
                });
                if (response.status === "OK") {
                    return {
                        status: "OK",
                    };
                } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                } else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        this.querier = querier;
    }
}
exports.default = RecipeImplementation;
