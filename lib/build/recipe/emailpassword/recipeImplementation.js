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
                // Here we do this check because if the input email already exists with a primary user,
                // then we do not allow sign up, cause even though we do not link this and the existing
                // account right away, and we send an email verification link, the user
                // may click on it by mistake assuming it's for their existing account - resulting
                // in account take over. In this case, we return an EMAIL_ALREADY_EXISTS_ERROR
                // and if the user goes through the forgot password flow, it will create
                // an account there and it will work fine cause there the email is also verified.
                let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    allowLinking: false,
                    userContext,
                });
                if (!isSignUpAllowed) {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
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
                let userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                    // we can use index 0 cause this is a new recipe user
                    recipeUserId: response.user.loginMethods[0].recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    isVerified: false,
                    userContext,
                });
                let updatedUser = yield __1.getUser(userId, userContext);
                if (updatedUser === undefined) {
                    throw new Error("Should never come here.");
                }
                // this is there cause getUser sets an empty map for normalizedInputMap
                updatedUser.normalizedInputMap = response.user.normalizedInputMap;
                return {
                    status: "OK",
                    user: updatedUser,
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
                if (process.env.MOCK !== "true") {
                    // the input user ID can be a recipe or a primary user ID.
                    return yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
                        {
                            userId,
                            email,
                        }
                    );
                } else {
                    return mockCore_1.mockCreatePasswordResetToken(email, userId);
                }
            });
        },
        consumePasswordResetToken: function ({ token }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    return yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/user/password/reset/token/consume"),
                        {
                            token,
                        }
                    );
                } else {
                    return mockCore_1.mockConsumePasswordResetToken(token);
                }
            });
        },
        getPasswordResetTokenInfo: function ({ token }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
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
                // the input userId must be a recipe user ID.
                return yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                });
            });
        },
    };
}
exports.default = getRecipeInterface;
