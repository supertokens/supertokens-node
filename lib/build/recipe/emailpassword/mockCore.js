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
exports.mockUpdateEmailOrPassword = exports.mockCreateRecipeUser = exports.mockSignIn = exports.mockConsumePasswordResetToken = exports.mockCreatePasswordResetToken = void 0;
const axios_1 = __importDefault(require("axios"));
const mockCore_1 = require("../accountlinking/mockCore");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
let passwordResetTokens = {};
function mockCreatePasswordResetToken(email, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield axios_1.default(`http://localhost:8080/recipe/user/password/reset/token`, {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            data: {
                email,
                userId,
            },
        });
        if (response.data.status === "UNKNOWN_USER_ID_ERROR") {
            // this is cause maybe we are trying to use a primary user id..
            let user = yield mockCore_1.mockGetUser({
                userId,
            });
            if (user !== undefined) {
                response.data.status = "OK";
                response.data.token = (Math.random() + 1).toString(36).substring(7);
            } else {
                return response.data;
            }
        }
        passwordResetTokens[response.data.token] = {
            userId,
            email,
        };
        return {
            status: "OK",
            token: response.data.token,
        };
    });
}
exports.mockCreatePasswordResetToken = mockCreatePasswordResetToken;
function mockConsumePasswordResetToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        if (passwordResetTokens[token] === undefined) {
            return {
                status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
            };
        }
        let userId = passwordResetTokens[token].userId;
        let email = passwordResetTokens[token].email;
        delete passwordResetTokens[token];
        return {
            status: "OK",
            userId,
            email,
        };
    });
}
exports.mockConsumePasswordResetToken = mockConsumePasswordResetToken;
function mockSignIn(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield axios_1.default(`http://localhost:8080/recipe/signin`, {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            data: {
                email: input.email,
                password: input.password,
            },
        });
        if (response.data.status === "WRONG_CREDENTIALS_ERROR") {
            return response.data;
        }
        let user = response.data.user;
        return {
            status: "OK",
            user: yield mockCore_1.mockGetUser({
                userId: user.id,
            }),
        };
    });
}
exports.mockSignIn = mockSignIn;
function mockCreateRecipeUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield axios_1.default(`http://localhost:8080/recipe/signup`, {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            data: {
                email: input.email,
                password: input.password,
            },
        });
        if (response.data.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return response.data;
        }
        let user = response.data.user;
        return {
            status: "OK",
            user: mockCore_1.createUserObject({
                id: user.id,
                emails: [user.email],
                timeJoined: user.timeJoined,
                isPrimaryUser: false,
                phoneNumbers: [],
                thirdParty: [],
                loginMethods: [
                    {
                        recipeId: "emailpassword",
                        recipeUserId: new recipeUserId_1.default(user.id),
                        timeJoined: user.timeJoined,
                        verified: false,
                        email: user.email,
                    },
                ],
            }),
        };
    });
}
exports.mockCreateRecipeUser = mockCreateRecipeUser;
function mockUpdateEmailOrPassword(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let shouldMarkEmailVerified = false;
        if (input.email !== undefined) {
            let user = yield recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
                userId: input.recipeUserId.getAsString(),
                userContext: {},
            });
            // if we are doing account linking, then we do the check below regardless of
            //if the current user is primary one or not. This is to prevent the following attack scenario:
            // - attacker creates account with email "A" which they do not verify (even though they own the email).
            // - victim signs up with email "V" using google, and that is not a primary user.
            // - attacker changes their email to "V", which shoots an email verification email to the victim.
            // - the victim thinks that they are getting an email verification email for their google account, and clicks on it.
            // - the victim's account is now compromised cause the attacker's account is now linked to
            // the victim's account.
            // To prevent this, we disallow the attacker's account to change the email in the first place
            // even though their account is still just a recipe level account.
            if (user !== undefined && (user.isPrimaryUser || input.isAccountLinkingEnabled)) {
                let existingUsersWithNewEmail = yield recipe_1.default
                    .getInstance()
                    .recipeInterfaceImpl.listUsersByAccountInfo({
                        accountInfo: {
                            email: input.email,
                        },
                        userContext: {},
                    });
                let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
                if (primaryUserForNewEmail.length === 1) {
                    if (primaryUserForNewEmail[0].id === user.id) {
                        user.loginMethods.forEach((loginMethod) => {
                            if (loginMethod.hasSameEmailAs(input.email) && loginMethod.verified) {
                                shouldMarkEmailVerified = true;
                            }
                        });
                    } else {
                        return {
                            status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                            reason: "New email is associated with another primary user ID",
                        };
                    }
                }
            }
        }
        let response = yield input.querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
            userId: input.recipeUserId.getAsString(),
            email: input.email,
            password: input.password,
        });
        if (response.status === "OK" && shouldMarkEmailVerified) {
            let EmailVerification = require("../emailverification");
            try {
                let tokenResp = yield EmailVerification.createEmailVerificationToken(input.recipeUserId);
                if (tokenResp.status === "OK") {
                    yield EmailVerification.verifyEmailUsingToken(tokenResp.token);
                }
            } catch (err) {
                if (err.message === "Initialisation not done. Did you forget to call the SuperTokens.init function?") {
                    // this means email verification is not enabled.. So we just ignore.
                } else {
                    throw err;
                }
            }
        }
        return response;
    });
}
exports.mockUpdateEmailOrPassword = mockUpdateEmailOrPassword;
