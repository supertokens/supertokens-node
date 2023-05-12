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
exports.mockFetchFromAccountToLinkTable = exports.mockGetUser = exports.mockListUsersByAccountInfo = void 0;
const axios_1 = __importDefault(require("axios"));
function isEmailVerified(userId, email) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield axios_1.default.get(
            `http://localhost:8080/recipe/user/email/verify?userId=${userId}&email=${email}`,
            {
                headers: {
                    rid: "emailverification",
                },
            }
        );
        return response.data.status === "OK" && response.data.isVerified;
    });
}
function mockListUsersByAccountInfo({ accountInfo }) {
    return __awaiter(this, void 0, void 0, function* () {
        let users = [];
        if (accountInfo.email !== undefined) {
            // email password
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/user?email=${accountInfo.email}`,
                    {
                        headers: {
                            rid: "emailpassword",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    let user = response.data.user;
                    let verified = yield isEmailVerified(user.id, user.email);
                    users.push({
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
                                verified,
                                email: user.email,
                            },
                        ],
                    });
                }
            }
            // third party
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/users/by-email?email=${accountInfo.email}`,
                    {
                        headers: {
                            rid: "thirdparty",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    for (let i = 0; i < response.data.users.length; i++) {
                        let user = response.data.users[i];
                        let verified = yield isEmailVerified(user.id, user.email);
                        users.push({
                            id: user.id,
                            emails: [user.email],
                            timeJoined: user.timeJoined,
                            isPrimaryUser: false,
                            phoneNumbers: [],
                            thirdParty: [user.thirdParty],
                            loginMethods: [
                                {
                                    recipeId: "thirdparty",
                                    recipeUserId: user.id,
                                    timeJoined: user.timeJoined,
                                    verified,
                                    email: user.email,
                                    thirdParty: user.thirdParty,
                                },
                            ],
                        });
                    }
                }
            }
            // passwordless
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/user?email=${accountInfo.email}`,
                    {
                        headers: {
                            rid: "passwordless",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    for (let i = 0; i < response.data.users.length; i++) {
                        let user = response.data.users[i];
                        let verified = yield isEmailVerified(user.id, user.email);
                        users.push({
                            id: user.id,
                            emails: [user.email],
                            timeJoined: user.timeJoined,
                            isPrimaryUser: false,
                            phoneNumbers: [],
                            thirdParty: [],
                            loginMethods: [
                                {
                                    recipeId: "passwordless",
                                    recipeUserId: user.id,
                                    timeJoined: user.timeJoined,
                                    verified,
                                    email: user.email,
                                },
                            ],
                        });
                    }
                }
            }
        }
        if (accountInfo.phoneNumber !== undefined) {
            // passwordless
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/user?phoneNumber=${accountInfo.phoneNumber}`,
                    {
                        headers: {
                            rid: "passwordless",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    for (let i = 0; i < response.data.users.length; i++) {
                        let user = response.data.users[i];
                        users.push({
                            id: user.id,
                            emails: [],
                            timeJoined: user.timeJoined,
                            isPrimaryUser: false,
                            phoneNumbers: [user.phoneNumber],
                            thirdParty: [],
                            loginMethods: [
                                {
                                    recipeId: "passwordless",
                                    recipeUserId: user.id,
                                    timeJoined: user.timeJoined,
                                    verified: true,
                                    phoneNumber: user.phoneNumber,
                                },
                            ],
                        });
                    }
                }
            }
        }
        if (accountInfo.thirdParty !== undefined) {
            // third party
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/user?thirdPartyId=${accountInfo.thirdParty.id}&thirdPartyUserId=${accountInfo.thirdParty.userId}`,
                    {
                        headers: {
                            rid: "thirdparty",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    let user = response.data.user;
                    let verified = yield isEmailVerified(user.id, user.email);
                    users.push({
                        id: user.id,
                        emails: [user.email],
                        timeJoined: user.timeJoined,
                        isPrimaryUser: false,
                        phoneNumbers: [],
                        thirdParty: [user.thirdParty],
                        loginMethods: [
                            {
                                recipeId: "thirdparty",
                                recipeUserId: user.id,
                                timeJoined: user.timeJoined,
                                verified,
                                email: user.email,
                                thirdParty: user.thirdParty,
                            },
                        ],
                    });
                }
            }
        }
        return users;
    });
}
exports.mockListUsersByAccountInfo = mockListUsersByAccountInfo;
function mockGetUser({ userId }) {
    return __awaiter(this, void 0, void 0, function* () {
        // email password
        {
            let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
                headers: {
                    rid: "emailpassword",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = yield isEmailVerified(user.id, user.email);
                return {
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
                            verified,
                            email: user.email,
                        },
                    ],
                };
            }
        }
        // third party
        {
            let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = yield isEmailVerified(user.id, user.email);
                return {
                    id: user.id,
                    emails: [user.email],
                    timeJoined: user.timeJoined,
                    isPrimaryUser: false,
                    phoneNumbers: [],
                    thirdParty: [user.thirdParty],
                    loginMethods: [
                        {
                            recipeId: "thirdparty",
                            recipeUserId: user.id,
                            timeJoined: user.timeJoined,
                            verified,
                            email: user.email,
                            thirdParty: user.thirdParty,
                        },
                    ],
                };
            }
        }
        // passwordless
        {
            let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                for (let i = 0; i < response.data.users.length; i++) {
                    let user = response.data.users[i];
                    let verified = yield isEmailVerified(user.id, user.email);
                    return {
                        id: user.id,
                        emails: [user.email],
                        timeJoined: user.timeJoined,
                        isPrimaryUser: false,
                        phoneNumbers: [],
                        thirdParty: [],
                        loginMethods: [
                            {
                                recipeId: "passwordless",
                                recipeUserId: user.id,
                                timeJoined: user.timeJoined,
                                verified,
                                email: user.email,
                            },
                        ],
                    };
                }
            }
        }
        return undefined;
    });
}
exports.mockGetUser = mockGetUser;
function mockFetchFromAccountToLinkTable(_) {
    return __awaiter(this, void 0, void 0, function* () {
        return undefined;
    });
}
exports.mockFetchFromAccountToLinkTable = mockFetchFromAccountToLinkTable;
