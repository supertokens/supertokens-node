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
const useridmapping_1 = require("../useridmapping");
function getRecipeInterface(querier) {
    return {
        createEmailVerificationToken: function ({ userId, email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield useridmapping_1.getUserIdMapping(
                        userId,
                        useridmapping_1.UserIdType.ANY,
                        userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                let response = yield querier.sendPostRequest(
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
                    try {
                        let userIdMappingResponse = yield useridmapping_1.getUserIdMapping(
                            response.userId,
                            useridmapping_1.UserIdType.SUPERTOKENS,
                            userContext
                        );
                        if (userIdMappingResponse.status === "OK") {
                            response.userId = userIdMappingResponse.externalUserId;
                        }
                    } catch (error) {
                        // ignore errors
                    }
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
        },
        isEmailVerified: function ({ userId, email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield useridmapping_1.getUserIdMapping(
                        userId,
                        useridmapping_1.UserIdType.ANY,
                        userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify"),
                    {
                        userId,
                        email,
                    }
                );
                return response.isVerified;
            });
        },
        revokeEmailVerificationTokens: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield useridmapping_1.getUserIdMapping(
                        input.userId,
                        useridmapping_1.UserIdType.ANY,
                        input.userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        input.userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/email/verify/token/remove"),
                    {
                        userId: input.userId,
                        email: input.email,
                    }
                );
                return { status: "OK" };
            });
        },
        unverifyEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let userIdMappingResponse = yield useridmapping_1.getUserIdMapping(
                        input.userId,
                        useridmapping_1.UserIdType.ANY,
                        input.userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        input.userId = userIdMappingResponse.superTokensUserId;
                    }
                } catch (error) {
                    // ignore errors
                }
                yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/email/verify/remove"), {
                    userId: input.userId,
                    email: input.email,
                });
                return { status: "OK" };
            });
        },
    };
}
exports.default = getRecipeInterface;
