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
const emailPasswordRecipeImplementation_1 = require("./emailPasswordRecipeImplementation");
const thirdPartyRecipeImplementation_1 = require("./thirdPartyRecipeImplementation");
function getRecipeInterface(emailPasswordQuerier, thirdPartyQuerier) {
    let originalEmailPasswordImplementation = recipeImplementation_1.default(emailPasswordQuerier);
    let originalThirdPartyImplementation;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = recipeImplementation_2.default(thirdPartyQuerier);
    }
    return {
        emailPasswordSignUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield originalEmailPasswordImplementation.signUp.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        emailPasswordSignIn: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalEmailPasswordImplementation.signIn.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        thirdPartySignInUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (originalThirdPartyImplementation === undefined) {
                    throw new Error("No thirdparty provider configured");
                }
                return originalThirdPartyImplementation.signInUp.bind(thirdPartyRecipeImplementation_1.default(this))(
                    input
                );
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield originalEmailPasswordImplementation.getUserById.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
                if (user !== undefined) {
                    return user;
                }
                if (originalThirdPartyImplementation === undefined) {
                    return undefined;
                }
                return yield originalThirdPartyImplementation.getUserById.bind(
                    thirdPartyRecipeImplementation_1.default(this)
                )(input);
            });
        },
        getUsersByEmail: function ({ email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let userFromEmailPass = yield originalEmailPasswordImplementation.getUserByEmail.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )({ email, userContext });
                if (originalThirdPartyImplementation === undefined) {
                    return userFromEmailPass === undefined ? [] : [userFromEmailPass];
                }
                let usersFromThirdParty = yield originalThirdPartyImplementation.getUsersByEmail.bind(
                    thirdPartyRecipeImplementation_1.default(this)
                )({ email, userContext });
                if (userFromEmailPass !== undefined) {
                    return [...usersFromThirdParty, userFromEmailPass];
                }
                return usersFromThirdParty;
            });
        },
        getUserByThirdPartyInfo: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (originalThirdPartyImplementation === undefined) {
                    return undefined;
                }
                return originalThirdPartyImplementation.getUserByThirdPartyInfo.bind(
                    thirdPartyRecipeImplementation_1.default(this)
                )(input);
            });
        },
        createResetPasswordToken: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalEmailPasswordImplementation.createResetPasswordToken.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        resetPasswordUsingToken: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalEmailPasswordImplementation.resetPasswordUsingToken.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield this.getUserById({ userId: input.userId, userContext: input.userContext });
                if (user === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                } else if (user.thirdParty !== undefined) {
                    throw new Error("Cannot update email or password of a user who signed up using third party login.");
                }
                return originalEmailPasswordImplementation.updateEmailOrPassword.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
