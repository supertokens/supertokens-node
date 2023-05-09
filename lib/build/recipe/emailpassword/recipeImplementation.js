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
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: function ({ email, password, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                // this function does not check if there is some primary user where the email
                // of that primary user is unverified (isSignUpAllowed function logic) cause
                // that is checked in the API layer before calling this function.
                // This is the recipe function layer which can be
                // called by the user manually as well if they want to. So we allow them to do that.
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
                    session: undefined,
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
                return yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signup"), {
                    email: input.email,
                    password: input.password,
                });
            });
        },
        signIn: function ({ email, password }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signin"), {
                    email,
                    password,
                });
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
