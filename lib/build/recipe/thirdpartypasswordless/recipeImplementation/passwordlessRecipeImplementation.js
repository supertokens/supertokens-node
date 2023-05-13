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
function getRecipeInterface(recipeInterface) {
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.consumeCode(input);
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.createCode(input);
            });
        },
        createNewCodeForDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.createNewCodeForDevice(input);
            });
        },
        getUserByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let users = yield recipeInterface.getUsersByEmail(input);
                for (let i = 0; i < users.length; i++) {
                    let u = users[i];
                    if (!("thirdParty" in u)) {
                        return u;
                    }
                }
                return undefined;
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield recipeInterface.getUserById(input);
                if (user !== undefined && "thirdParty" in user) {
                    // this is a thirdparty user.
                    return undefined;
                }
                return user;
            });
        },
        getUserByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield recipeInterface.getUserByPhoneNumber(input);
                if (user !== undefined && "thirdParty" in user) {
                    // this is a thirdparty user.
                    return undefined;
                }
                return user;
            });
        },
        listCodesByDeviceId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.listCodesByDeviceId(input);
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.listCodesByEmail(input);
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.listCodesByPhoneNumber(input);
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.listCodesByPreAuthSessionId(input);
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.revokeAllCodes(input);
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.revokeCode(input);
            });
        },
        updateUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.updatePasswordlessUser(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
