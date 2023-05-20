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
exports.mockCreateRecipeUser = exports.mockSignIn = exports.mockConsumePasswordResetToken = exports.mockCreatePasswordResetToken = void 0;
const axios_1 = __importDefault(require("axios"));
const mockCore_1 = require("../accountlinking/mockCore");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
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
            return response.data;
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
        const normalizedInputMap = {};
        normalizedInputMap[input.email] = input.email.toLowerCase().trim();
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
                normalizedInputMap,
            }),
        };
    });
}
exports.mockSignIn = mockSignIn;
function mockCreateRecipeUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedInputMap = {};
        normalizedInputMap[input.email] = input.email.toLowerCase().trim();
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
                normalizedInputMap,
            }),
        };
    });
}
exports.mockCreateRecipeUser = mockCreateRecipeUser;
