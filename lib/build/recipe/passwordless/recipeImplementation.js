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
const mockCore_1 = require("./mockCore");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../emailverification/recipe"));
function getRecipeInterface(querier) {
    function copyAndRemoveUserContext(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        return result;
    }
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/code/consume"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockConsumeCode(input);
                }
                if (response.status === "OK") {
                    const loginMethod = response.user.loginMethods.find((m) => m.recipeId === "passwordless");
                    if (loginMethod === undefined) {
                        throw new Error("This should never happen: login method not found after signin");
                    }
                    if (loginMethod.email !== undefined) {
                        const emailVerificationInstance = recipe_1.default.getInstance();
                        if (emailVerificationInstance) {
                            const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                {
                                    recipeUserId: loginMethod.recipeUserId,
                                    email: loginMethod.email,
                                    userContext: input.userContext,
                                }
                            );
                            if (tokenResponse.status === "OK") {
                                yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                    token: tokenResponse.token,
                                    attemptAccountLinking: false,
                                    userContext: input.userContext,
                                });
                            }
                        }
                    }
                }
                return response;
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/code"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockCreateCode(input);
                }
                return response;
            });
        },
        createNewCodeForDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/code"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockCreateNewCodeForDevice(input);
                }
                return response;
            });
        },
        listCodesByDeviceId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/codes"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockListCodesByDeviceId(input);
                }
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/codes"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockListCodesByEmail(input);
                }
                return response.devices;
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/codes"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockListCodesByPhoneNumber(input);
                }
                return response.devices;
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/codes"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockListCodesByPreAuthSessionId(input);
                }
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/codes/remove"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    yield mockCore_1.mockRevokeAllCodes(input);
                }
                return {
                    status: "OK",
                };
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/signinup/code/remove"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    yield mockCore_1.mockRevokeCode(input);
                }
                return { status: "OK" };
            });
        },
        updateUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendPutRequest(
                        new normalisedURLPath_1.default("/recipe/user"),
                        copyAndRemoveUserContext(input)
                    );
                } else {
                    response = yield mockCore_1.mockUpdateUser(input);
                }
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
