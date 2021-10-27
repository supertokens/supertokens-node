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
        signUp: function ({ email, password }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield recipeInterface.signUp({ email, password });
            });
        },
        signIn: function ({ email, password }) {
            return __awaiter(this, void 0, void 0, function* () {
                return recipeInterface.signIn({ email, password });
            });
        },
        getUserById: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield recipeInterface.getUserById({ userId });
                if (user === undefined || user.thirdParty !== undefined) {
                    // either user is undefined or it's a thirdparty user.
                    return undefined;
                }
                return user;
            });
        },
        getUserByEmail: function ({ email }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield recipeInterface.getUsersByEmail({ email });
                for (let i = 0; i < result.length; i++) {
                    if (result[i].thirdParty === undefined) {
                        return result[i];
                    }
                }
                return undefined;
            });
        },
        createResetPasswordToken: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                return recipeInterface.createResetPasswordToken({ userId });
            });
        },
        resetPasswordUsingToken: function ({ token, newPassword }) {
            return __awaiter(this, void 0, void 0, function* () {
                return recipeInterface.resetPasswordUsingToken({ token, newPassword });
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return recipeInterface.updateEmailOrPassword(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
