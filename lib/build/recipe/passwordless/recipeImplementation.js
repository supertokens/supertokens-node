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
function getRecipeInterface(querier) {
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code/consume"),
                    input
                );
                return response;
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code"),
                    input
                );
                return response;
            });
        },
        resendCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code"),
                    input
                );
                return response;
            });
        },
        getUserByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), input);
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), input);
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), input);
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        listCodesByDeviceId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    input
                );
                return {
                    status: "OK",
                    device: response.devices.length === 1 ? response.devices[0] : undefined,
                };
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    input
                );
                return response;
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    input
                );
                return response;
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    input
                );
                return response;
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup/codes/remove"), input);
                return {
                    status: "OK",
                };
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup/code/remove"), input);
                return { status: "OK" };
            });
        },
        updateUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), input);
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
