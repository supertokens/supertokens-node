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
const recipeImplementation_1 = require("../../emailpassword/recipeImplementation");
const recipeImplementation_2 = require("../../thirdparty/recipeImplementation");
function getRecipeInterface(emailPasswordQuerier, thirdPartyQuerier) {
    let emailPasswordImplementation = recipeImplementation_1.default(emailPasswordQuerier);
    let thirdPartyImplementation;
    if (thirdPartyQuerier !== undefined) {
        thirdPartyImplementation = recipeImplementation_2.default(thirdPartyQuerier);
    }
    return {
        signUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield emailPasswordImplementation.signUp(input);
            });
        },
        signIn: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return emailPasswordImplementation.signIn(input);
            });
        },
        signInUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (thirdPartyImplementation === undefined) {
                    throw new Error("No thirdparty provider configured");
                }
                return thirdPartyImplementation.signInUp(input);
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield emailPasswordImplementation.getUserById(input);
                if (user !== undefined) {
                    return user;
                }
                if (thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return yield thirdPartyImplementation.getUserById(input);
            });
        },
        getUsersByEmail: function ({ email }) {
            return __awaiter(this, void 0, void 0, function* () {
                let userFromEmailPass = yield emailPasswordImplementation.getUserByEmail({ email });
                if (thirdPartyImplementation === undefined) {
                    return userFromEmailPass === undefined ? [] : [userFromEmailPass];
                }
                let usersFromThirdParty = yield thirdPartyImplementation.getUsersByEmail({ email });
                if (userFromEmailPass !== undefined) {
                    return [...usersFromThirdParty, userFromEmailPass];
                }
                return usersFromThirdParty;
            });
        },
        getUserByThirdPartyInfo: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return thirdPartyImplementation.getUserByThirdPartyInfo(input);
            });
        },
        createResetPasswordToken: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return emailPasswordImplementation.createResetPasswordToken(input);
            });
        },
        resetPasswordUsingToken: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return emailPasswordImplementation.resetPasswordUsingToken(input);
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return emailPasswordImplementation.updateEmailOrPassword(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
