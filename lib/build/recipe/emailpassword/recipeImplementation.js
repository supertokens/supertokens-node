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
const index_1 = require("./../useridmapping/index");
const normalisedURLPath_1 = require("../../normalisedURLPath");
function getRecipeInterface(querier) {
    return {
        signUp: function ({ email, password }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
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
        },
        signIn: function ({ email, password, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                    email,
                    password,
                });
                if (response.status === "OK") {
                    try {
                        let userIdMappingResponse = yield index_1.getUserIdMapping(
                            response.user.id,
                            "ANY",
                            userContext
                        );
                        if (userIdMappingResponse.status === "OK") {
                            response.user.id = userIdMappingResponse.externalUserId;
                        }
                    } catch (error) {
                        // ignore error
                    }
                    return response;
                } else {
                    return {
                        status: "WRONG_CREDENTIALS_ERROR",
                    };
                }
            });
        },
        getUserById: function ({ userId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let externalUserId = undefined;
                try {
                    let userIdMappingResponse = yield index_1.getUserIdMapping(userId, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        userId = userIdMappingResponse.superTokensUserId;
                        externalUserId = userIdMappingResponse.externalUserId;
                    }
                } catch (error) {
                    // ignore error
                }
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    if (externalUserId !== undefined) {
                        response.user.id = externalUserId;
                    }
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        getUserByEmail: function ({ email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    email,
                });
                if (response.status === "OK") {
                    try {
                        let userIdMappingResponse = yield index_1.getUserIdMapping(
                            response.user.id,
                            "SUPERTOKENS",
                            userContext
                        );
                        if (userIdMappingResponse.status === "OK") {
                            response.user.id = userIdMappingResponse.externalUserId;
                        }
                    } catch (error) {
                        // ignore error
                    }
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        createResetPasswordToken: function ({ userId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield index_1.getUserIdMapping(userId, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                let response = yield querier.sendPostRequest(
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
        },
        resetPasswordUsingToken: function ({ token, newPassword, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset"),
                    {
                        method: "token",
                        token,
                        newPassword,
                    }
                );
                if (response.status === "OK" && response.userId !== undefined) {
                    try {
                        let userIdMappingResponse = yield index_1.getUserIdMapping(response.userId, "ANY", userContext);
                        if (userIdMappingResponse.status === "OK") {
                            response.userId = userIdMappingResponse.superTokensUserId;
                        }
                    } catch (error) {
                        // ignore errors
                    }
                }
                return response;
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield index_1.getUserIdMapping(input.userId, "ANY", input.userContext);
                    if (userIdMappingResponse.status === "OK") {
                        input.userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                let response = yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
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
        },
    };
}
exports.default = getRecipeInterface;
