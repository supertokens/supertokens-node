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
    function copyAndRemoveUserContext(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        return result;
    }
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code/consume"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        createNewCodeForDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        getUserByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContext(input)
                );
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContext(input)
                );
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContext(input)
                );
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
                    copyAndRemoveUserContext(input)
                );
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    copyAndRemoveUserContext(input)
                );
                return response.devices;
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    copyAndRemoveUserContext(input)
                );
                return response.devices;
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes"),
                    copyAndRemoveUserContext(input)
                );
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/codes/remove"),
                    copyAndRemoveUserContext(input)
                );
                return {
                    status: "OK",
                };
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/signinup/code/remove"),
                    copyAndRemoveUserContext(input)
                );
                return { status: "OK" };
            });
        },
        updateUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
