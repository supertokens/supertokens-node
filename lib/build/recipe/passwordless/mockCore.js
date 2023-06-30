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
exports.mockUpdateUser = exports.mockRevokeAllCodes = exports.mockRevokeCode = exports.mockListCodesByPreAuthSessionId = exports.mockListCodesByPhoneNumber = exports.mockListCodesByEmail = exports.mockListCodesByDeviceId = exports.mockCreateNewCodeForDevice = exports.mockCreateCode = exports.mockConsumeCode = void 0;
const axios_1 = __importDefault(require("axios"));
const mockCore_1 = require("../accountlinking/mockCore");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const baseURL = "http://localhost:8080/";
const mockConsumeCode = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        let resp;
        try {
            resp = yield axios_1.default("/recipe/signinup/code/consume", {
                method: "POST",
                baseURL,
                headers: {
                    rid: "passwordless",
                    "content-type": "application/json",
                },
                data: copyAndRemoveUserContext(input),
            });
        } catch (err) {
            if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
                throw new Error(
                    "SuperTokens core threw an error, " +
                        "status code: " +
                        err.response.status +
                        " and message: " +
                        err.response.data
                );
            } else {
                throw err;
            }
        }
        if (resp.data.status !== "OK") {
            return resp.data;
        }
        const user = resp.data.user;
        if (resp.data.createdNewUser) {
            resp.data.user = mockCore_1.createUserObject({
                id: user.id,
                timeJoined: user.timeJoined,
                isPrimaryUser: false,
                emails: user.email ? [user.email] : [],
                phoneNumbers: user.phoneNumber ? [user.phoneNumber] : [],
                thirdParty: [],
                loginMethods: [
                    {
                        recipeId: "passwordless",
                        recipeUserId: new recipeUserId_1.default(user.id),
                        timeJoined: user.timeJoined,
                        verified: true,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                    },
                ],
            });
        } else {
            resp.data.user = yield mockCore_1.mockGetUser({
                userId: resp.data.user.id,
            });
        }
        return resp.data;
    });
};
exports.mockConsumeCode = mockConsumeCode;
const mockCreateCode = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/code", {
            method: "POST",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            data: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockCreateCode = mockCreateCode;
const mockCreateNewCodeForDevice = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/code", {
            method: "POST",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            data: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockCreateNewCodeForDevice = mockCreateNewCodeForDevice;
const mockListCodesByDeviceId = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/codes", {
            method: "GET",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            params: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockListCodesByDeviceId = mockListCodesByDeviceId;
const mockListCodesByEmail = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/codes", {
            method: "GET",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            params: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockListCodesByEmail = mockListCodesByEmail;
const mockListCodesByPhoneNumber = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/codes", {
            method: "GET",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            params: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockListCodesByPhoneNumber = mockListCodesByPhoneNumber;
const mockListCodesByPreAuthSessionId = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/codes", {
            method: "GET",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            params: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockListCodesByPreAuthSessionId = mockListCodesByPreAuthSessionId;
const mockRevokeCode = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/code/remove", {
            method: "POST",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            data: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockRevokeCode = mockRevokeCode;
const mockRevokeAllCodes = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default("/recipe/signinup/codes/remove", {
            method: "POST",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            data: copyAndRemoveUserContext(input),
        });
        return resp.data;
    });
};
exports.mockRevokeAllCodes = mockRevokeAllCodes;
const mockUpdateUser = function (input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (input.email !== null) {
            let user = yield recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
                userId: input.recipeUserId.getAsString(),
                userContext: {},
            });
            if (user !== undefined && user.isPrimaryUser) {
                let existingUsersWithNewEmail = yield recipe_1.default
                    .getInstance()
                    .recipeInterfaceImpl.listUsersByAccountInfo({
                        accountInfo: {
                            email: input.email,
                        },
                        doUnionOfAccountInfo: false,
                        userContext: {},
                    });
                // TODO: can this be anything other than 0 or 1?
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
        try {
            const resp = yield axios_1.default("/recipe/user", {
                method: "PUT",
                baseURL,
                headers: {
                    rid: "passwordless",
                    "content-type": "application/json",
                },
                data: copyAndRemoveUserContext(
                    Object.assign(Object.assign({}, input), { userId: input.recipeUserId.getAsString() })
                ),
            });
            return resp.data;
        } catch (err) {
            if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
                throw new Error(
                    "SuperTokens core threw an error, " +
                        "status code: " +
                        err.response.status +
                        " and message: " +
                        err.response.data
                );
            } else {
                throw err;
            }
        }
    });
};
exports.mockUpdateUser = mockUpdateUser;
function copyAndRemoveUserContext(input) {
    let result = Object.assign({}, input);
    delete result.userContext;
    return result;
}
