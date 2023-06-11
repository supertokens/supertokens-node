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
const emailverification_1 = __importDefault(require("../emailverification"));
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: function ({ email, password, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
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
                    userContext,
                });
                let updatedUser = yield __1.getUser(userId, userContext);
                if (updatedUser === undefined) {
                    throw new Error("Should never come here.");
                }
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
                if (process.env.MOCK !== "true") {
                    return yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/user/password/reset/token"),
                        {
                            token,
                        }
                    );
                } else {
                    return mockCore_1.mockGetPasswordResetInfo(token);
                }
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
                let isAccountLinkingEnabled = false;
                // TODO: maybe this all should not happen here at all, and should be exposed
                // as another function in account linking recipe called isEmailChangeAllowed -
                // cause this is a recipe level function and we want to let devs call this
                // independently of the user calling it (via an API for example).
                // we check for this cause maybe the new email is already verified.
                let isVerified = yield emailverification_1.default.isEmailVerified(input.recipeUserId, input.email);
                if (input.email !== undefined && !isVerified) {
                    // we do all of this cause we need to know if the dev allows for
                    // account linking if we were to change the email of this user (since the
                    // core API requires this boolean). If the input user is already a primary
                    // user, then there will be no account linking done on email change, so we can just pass
                    // that has false. If the current user is a recipe user, and there is no primary
                    // user that exists for the new email, then also, there will be no account linking
                    // done, so we again pass it as false. Therefore the only time we need to check
                    // for account linking from the callback is if the current user is a recipe user,
                    // and it will be linked to a primary user post email verification change.
                    let user = yield recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
                        userId: input.recipeUserId.getAsString(),
                        userContext: {},
                    });
                    if (user !== undefined) {
                        let existingUsersWithNewEmail = yield recipe_1.default
                            .getInstance()
                            .recipeInterfaceImpl.listUsersByAccountInfo({
                                accountInfo: {
                                    email: input.email,
                                },
                                doUnionOfAccountInfo: false,
                                userContext: input.userContext,
                            });
                        let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
                        if (
                            primaryUserForNewEmail.length === 1 &&
                            primaryUserForNewEmail[0].id !== user.id &&
                            !user.isPrimaryUser
                        ) {
                            // the above if statement is done cause only then it implies that
                            // post email update, the current user will be linked to the primary user.
                            let shouldDoAccountLinking = yield recipe_1.default
                                .getInstance()
                                .config.shouldDoAutomaticAccountLinking(
                                    {
                                        recipeId: "emailpassword",
                                        email: input.email,
                                    },
                                    primaryUserForNewEmail[0],
                                    undefined,
                                    input.userContext
                                );
                            isAccountLinkingEnabled = shouldDoAccountLinking.shouldAutomaticallyLink;
                        }
                    }
                }
                if (process.env.MOCK !== "true") {
                    // the input userId must be a recipe user ID.
                    return yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                        userId: input.recipeUserId.getAsString(),
                        email: input.email,
                        password: input.password,
                    });
                } else {
                    return mockCore_1.mockUpdateEmailOrPassword(
                        Object.assign(Object.assign({}, input), { querier, isAccountLinkingEnabled })
                    );
                }
            });
        },
    };
}
exports.default = getRecipeInterface;
