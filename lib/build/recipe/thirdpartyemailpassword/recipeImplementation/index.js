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
const recipeImplementation_1 = __importDefault(require("../../emailpassword/recipeImplementation"));
const recipeImplementation_2 = __importDefault(require("../../thirdparty/recipeImplementation"));
const emailPasswordRecipeImplementation_1 = __importDefault(require("./emailPasswordRecipeImplementation"));
const thirdPartyRecipeImplementation_1 = __importDefault(require("./thirdPartyRecipeImplementation"));
const __1 = require("../../../");
function getRecipeInterface(emailPasswordQuerier, getEmailPasswordConfig, thirdPartyQuerier) {
    let originalEmailPasswordImplementation = recipeImplementation_1.default(
        emailPasswordQuerier,
        getEmailPasswordConfig
    );
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
        consumePasswordResetToken: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalEmailPasswordImplementation.consumePasswordResetToken.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        createNewEmailPasswordRecipeUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalEmailPasswordImplementation.createNewRecipeUser.bind(
                    emailPasswordRecipeImplementation_1.default(this)
                )(input);
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield __1.getUser(input.userId, input.userContext);
                if (user === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                let inputUserIdIsPointingToEmailPasswordUser =
                    user.loginMethods.find((lM) => {
                        return lM.recipeId === "emailpassword" && lM.recipeUserId === input.userId;
                    }) !== undefined;
                if (!inputUserIdIsPointingToEmailPasswordUser) {
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
