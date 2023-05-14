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
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const __1 = require("../..");
const constants_1 = require("./constants");
const mockCore_1 = require("./mockCore");
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: function ({ email, password, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let isSignUpAllowed = yield recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    userContext,
                });
                if (!isSignUpAllowed) {
                    return {
                        status: "SIGNUP_NOT_ALLOWED",
                        reason:
                            "The input email is already associated with a primary account where it is not verified. Please verify the other account before trying again.",
                    };
                }
                let response = yield this.createNewRecipeUser({
                    email,
                    password,
                    userContext,
                });
                if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return response;
                }
                let userId = yield recipe_1.default.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccounts({
                    // we can use index 0 cause this is a new recipe user
                    recipeUserId: response.user.loginMethods[0].recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    isVerified: false,
                    userContext,
                });
                return {
                    status: "OK",
                    user: yield __1.getUser(userId, userContext),
                };
            });
        },
        createNewRecipeUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    return yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
                        email: input.email,
                        password: input.password,
                    });
                } else {
                    return mockCore_1.mockCreateRecipeUser(input);
                }
            });
        },
        signIn: function ({ email, password }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    return yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                        email,
                        password,
                    });
                } else {
                    return mockCore_1.mockSignIn({ email, password });
                }
            });
        },
        createResetPasswordToken: function ({ userId, email }) {
            return __awaiter(this, void 0, void 0, function* () {
                // the input user ID can be a recipe or a primary user ID.
                return yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
                    {
                        userId,
                        email,
                    }
                );
            });
        },
        consumePasswordResetToken: function ({ token }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset/token/consume"),
                    {
                        token,
                    }
                );
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                    let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                    if (input.password !== undefined) {
                        const passwordField = formFields.filter(
                            (el) => el.id === constants_1.FORM_FIELD_PASSWORD_ID
                        )[0];
                        const error = yield passwordField.validate(input.password);
                        if (error !== undefined) {
                            return {
                                status: "PASSWORD_POLICY_VIOLATED_ERROR",
                                failureReason: error,
                            };
                        }
                    }
                }
                return yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: input.userId,
                    email: input.email,
                    password: input.password,
                });
            });
        },
    };
}
exports.default = getRecipeInterface;
