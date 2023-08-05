"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUpdateEmailOrPassword = exports.mockCreateRecipeUser = exports.mockSignIn = exports.mockConsumePasswordResetToken = exports.mockCreatePasswordResetToken = exports.mockReset = void 0;
const mockCore_1 = require("../accountlinking/mockCore");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
let passwordResetTokens = {};
async function mockReset() {
    passwordResetTokens = {};
}
exports.mockReset = mockReset;
async function mockCreatePasswordResetToken(email, userId, tenantId) {
    let response = await fetch(
        `http://localhost:8080/${
            tenantId !== null && tenantId !== void 0 ? tenantId : "public"
        }/recipe/user/password/reset/token`,
        {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email,
                userId,
            }),
        }
    );
    if (response.status !== 200) {
        throw new Error(await response.text());
    }
    const respBody = await response.json();
    if (respBody.status === "UNKNOWN_USER_ID_ERROR") {
        // this is cause maybe we are trying to use a primary user id..
        let user = await mockCore_1.mockGetUser({
            userId,
        });
        if (user !== undefined) {
            respBody.status = "OK";
            respBody.token = (Math.random() + 1).toString(36).substring(7);
        } else {
            return respBody;
        }
    }
    passwordResetTokens[respBody.token] = {
        userId,
        email,
    };
    return {
        status: "OK",
        token: respBody.token,
    };
}
exports.mockCreatePasswordResetToken = mockCreatePasswordResetToken;
async function mockConsumePasswordResetToken(token, newPassword, tenantId, querier) {
    if (passwordResetTokens[token] === undefined) {
        return {
            status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
        };
    }
    const res = await querier.sendPostRequest(
        new normalisedURLPath_1.default(
            `/${tenantId !== null && tenantId !== void 0 ? tenantId : "public"}/recipe/user/password/reset`
        ),
        {
            method: "token",
            token,
            newPassword,
        }
    );
    if (res.status !== "OK") {
        return res;
    }
    let userId = passwordResetTokens[token].userId;
    let email = passwordResetTokens[token].email;
    delete passwordResetTokens[token];
    return {
        status: "OK",
        userId,
        email,
    };
}
exports.mockConsumePasswordResetToken = mockConsumePasswordResetToken;
async function mockSignIn(input) {
    var _a;
    let response = await fetch(
        `http://localhost:8080/${(_a = input.tenantId) !== null && _a !== void 0 ? _a : "public"}/recipe/signin`,
        {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: input.email,
                password: input.password,
            }),
        }
    );
    const respBody = await response.json();
    if (respBody.status === "WRONG_CREDENTIALS_ERROR") {
        return respBody;
    }
    let user = respBody.user;
    return {
        status: "OK",
        user: await mockCore_1.mockGetUser({
            userId: user.id,
        }),
    };
}
exports.mockSignIn = mockSignIn;
async function mockCreateRecipeUser(input) {
    var _a;
    let response = await fetch(
        `http://localhost:8080/${(_a = input.tenantId) !== null && _a !== void 0 ? _a : "public"}/recipe/signup`,
        {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: input.email,
                password: input.password,
            }),
        }
    );
    const respBody = await response.json();
    if (respBody.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return respBody;
    }
    let user = respBody.user;
    return {
        status: "OK",
        user: mockCore_1.createUserObject({
            tenantIds: user.tenantIds,
            id: user.id,
            emails: [user.email],
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
                {
                    recipeId: "emailpassword",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified: false,
                    email: user.email,
                    tenantIds: user.tenantIds,
                },
            ],
        }),
    };
}
exports.mockCreateRecipeUser = mockCreateRecipeUser;
async function mockUpdateEmailOrPassword(input) {
    if (input.email !== undefined) {
        let user = await recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
            userId: input.recipeUserId.getAsString(),
            userContext: {},
        });
        if (user !== undefined && user.isPrimaryUser) {
            let existingUsersWithNewEmail = await recipe_1.default
                .getInstance()
                .recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: {
                        email: input.email,
                    },
                    doUnionOfAccountInfo: false,
                    userContext: {},
                });
            let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
            if (primaryUserForNewEmail.length === 1) {
                if (primaryUserForNewEmail[0].id !== user.id) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason: "New email is associated with another primary user ID",
                    };
                }
            }
        }
    }
    let response = await input.querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
        userId: input.recipeUserId.getAsString(),
        email: input.email,
        password: input.password,
    });
    return response;
}
exports.mockUpdateEmailOrPassword = mockUpdateEmailOrPassword;
