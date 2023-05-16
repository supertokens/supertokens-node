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
exports.mockFetchFromAccountToLinkTable = exports.mockGetUser = exports.mockListUsersByAccountInfo = exports.createUserObject = exports.mockGetUsers = void 0;
const axios_1 = __importDefault(require("axios"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function mockGetUsers(querier, input) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedInputMap = {};
        if (((_a = input.query) === null || _a === void 0 ? void 0 : _a.email) !== undefined) {
            let splitted = input.query.email.split(";");
            for (let s of splitted) {
                normalizedInputMap[s] = s.toLowerCase().trim();
            }
        }
        if (((_b = input.query) === null || _b === void 0 ? void 0 : _b.phone) !== undefined) {
            let splitted = input.query.phone.split(";");
            for (let s of splitted) {
                normalizedInputMap[s] = s.toLowerCase().trim();
            }
        }
        let includeRecipeIdsStr = undefined;
        if (input.includeRecipeIds !== undefined) {
            includeRecipeIdsStr = input.includeRecipeIds.join(",");
        }
        let response = yield querier.sendGetRequest(
            new normalisedURLPath_1.default("/users"),
            Object.assign(
                {
                    includeRecipeIds: includeRecipeIdsStr,
                    timeJoinedOrder: input.timeJoinedOrder,
                    limit: input.limit,
                    paginationToken: input.paginationToken,
                },
                input.query
            )
        );
        let users = [];
        for (let userObj of response.users) {
            let user = userObj.user;
            let verified = true;
            if (user.email !== undefined) {
                verified = yield isEmailVerified(user.id, user.email);
            }
            let userWithoutHelperFunctions = {
                id: user.id,
                timeJoined: user.timeJoined,
                isPrimaryUser: false,
                emails: user.email === undefined ? [] : [user.email],
                phoneNumbers: user.phoneNumber === undefined ? [] : [user.phoneNumber],
                thirdParty: user.thirdParty === undefined ? [] : [user.thirdParty],
                loginMethods: [
                    {
                        recipeId: userObj.recipeId,
                        recipeUserId: user.id,
                        timeJoined: user.timeJoined,
                        verified,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        thirdParty: user.thirdParty,
                    },
                ],
                normalizedInputMap,
            };
            users.push(createUserObject(userWithoutHelperFunctions));
        }
        return {
            users: users,
            nextPaginationToken: response.nextPaginationToken,
        };
    });
}
exports.mockGetUsers = mockGetUsers;
function createUserObject(input) {
    function getHasSameEmailAs(lM) {
        function hasSameEmailAs(email) {
            var _a;
            if (email === undefined) {
                return false;
            }
            let normalisedEmail = (_a = input.normalizedInputMap[email]) !== null && _a !== void 0 ? _a : email;
            return lM.email !== undefined && lM.email === normalisedEmail;
        }
        return hasSameEmailAs;
    }
    function getHasSamePhoneNumberAs(lM) {
        function hasSamePhoneNumberAs(phoneNumber) {
            var _a;
            if (phoneNumber === undefined) {
                return false;
            }
            let normalisedPhoneNumber =
                (_a = input.normalizedInputMap[phoneNumber]) !== null && _a !== void 0 ? _a : phoneNumber;
            return lM.phoneNumber !== undefined && lM.phoneNumber === normalisedPhoneNumber;
        }
        return hasSamePhoneNumberAs;
    }
    function getHasSameThirdPartyInfoAs(lM) {
        function hasSameThirdPartyInfoAs(thirdParty) {
            if (thirdParty === undefined) {
                return false;
            }
            return (
                lM.thirdParty !== undefined &&
                lM.thirdParty.id === thirdParty.id &&
                lM.thirdParty.userId === thirdParty.userId
            );
        }
        return hasSameThirdPartyInfoAs;
    }
    return Object.assign(Object.assign({}, input), {
        loginMethods: input.loginMethods.map((lM) => {
            return Object.assign(Object.assign({}, lM), {
                hasSameEmailAs: getHasSameEmailAs(lM),
                hasSamePhoneNumberAs: getHasSamePhoneNumberAs(lM),
                hasSameThirdPartyInfoAs: getHasSameThirdPartyInfoAs(lM),
            });
        }),
    });
}
exports.createUserObject = createUserObject;
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
        // we want to provide all the normalized inputs to the user
        const normalizedInputMap = {};
        if (accountInfo.email !== undefined) {
            normalizedInputMap[accountInfo.email] = accountInfo.email.toLowerCase().trim();
        }
        if (accountInfo.phoneNumber !== undefined) {
            // TODO: need to normalize phone number
            normalizedInputMap[accountInfo.phoneNumber] = accountInfo.phoneNumber.toLowerCase().trim();
        }
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
                    users.push(
                        createUserObject({
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
                            normalizedInputMap,
                        })
                    );
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
                        users.push(
                            createUserObject({
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
                                normalizedInputMap,
                            })
                        );
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
                        users.push(
                            createUserObject({
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
                                normalizedInputMap,
                            })
                        );
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
                        users.push(
                            createUserObject({
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
                                normalizedInputMap,
                            })
                        );
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
                    users.push(
                        createUserObject({
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
                            normalizedInputMap,
                        })
                    );
                }
            }
        }
        return users;
    });
}
exports.mockListUsersByAccountInfo = mockListUsersByAccountInfo;
function mockGetUser({ userId }) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedInputMap = {};
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
                return createUserObject({
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
                    normalizedInputMap,
                });
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
                return createUserObject({
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
                    normalizedInputMap,
                });
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
                    return createUserObject({
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
                        normalizedInputMap,
                    });
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
