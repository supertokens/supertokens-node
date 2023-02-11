"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const accountlinking_1 = require("../accountlinking");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const __1 = require("../..");
const recipe_1 = require("../emailverification/recipe");
function getRecipeInterface(querier) {
    return {
        signUp: function ({ email, password, doAutomaticAccountLinking, userContext, }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    if (doAutomaticAccountLinking) {
                        let primaryUserId = yield accountlinking_1.default.doPostSignUpAccountLinkingOperations({
                            email,
                            recipeId: "emailpassword",
                        }, false, response.user.id, userContext);
                        response.user.id = primaryUserId;
                    }
                    return response;
                }
                else {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            });
        },
        signIn: function ({ email, password, }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    return response;
                }
                else {
                    return {
                        status: "WRONG_CREDENTIALS_ERROR",
                    };
                }
            });
        },
        getUserById: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                }
                else {
                    return undefined;
                }
            });
        },
        getUserByEmail: function ({ email }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    email,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                }
                else {
                    return undefined;
                }
            });
        },
        createResetPasswordToken: function ({ userId, email, }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/password/reset/token"), {
                    userId,
                    email,
                });
                if (response.status === "OK") {
                    return {
                        status: "OK",
                        token: response.token,
                    };
                }
                else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        },
        resetPasswordUsingToken: function ({ token, newPassword, }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/password/reset"), {
                    method: "token",
                    token,
                    newPassword,
                });
                return response;
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let markEmailAsVerified = false;
                if (input.email !== undefined) {
                    let userForUserId = yield __1.getUser(input.userId);
                    if (userForUserId !== undefined && userForUserId.isPrimaryUser) {
                        let usersForEmail = yield __1.listUsersByAccountInfo({
                            email: input.email,
                        });
                        if (usersForEmail !== undefined) {
                            let primaryUserFromEmailUsers = usersForEmail.find((u) => u.isPrimaryUser);
                            if (primaryUserFromEmailUsers !== undefined) {
                                if (primaryUserFromEmailUsers.id !== userForUserId.id) {
                                    return {
                                        status: "EMAIL_CHANGE_NOT_ALLOWED",
                                    };
                                }
                                markEmailAsVerified = true;
                            }
                        }
                    }
                }
                let response = yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: input.userId,
                    email: input.email,
                    password: input.password,
                });
                if (response.status === "OK") {
                    if (markEmailAsVerified && input.email !== undefined) {
                        const emailVerificationInstance = recipe_1.default.getInstance();
                        if (emailVerificationInstance) {
                            const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken({
                                userId: input.userId,
                                email: input.email,
                                userContext: undefined,
                            });
                            if (tokenResponse.status === "OK") {
                                yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                    token: tokenResponse.token,
                                    userContext: undefined,
                                });
                            }
                        }
                    }
                    return {
                        status: "OK",
                    };
                }
                else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
                else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        },
    };
}
exports.default = getRecipeInterface;
