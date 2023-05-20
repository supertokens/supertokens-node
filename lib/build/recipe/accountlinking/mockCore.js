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
exports.mockFetchFromAccountToLinkTable = exports.mockGetUser = exports.mockListUsersByAccountInfo = exports.createUserObject = exports.mockGetUsers = exports.mockCreatePrimaryUser = exports.mockCanCreatePrimaryUser = void 0;
const axios_1 = __importDefault(require("axios"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
let primaryUserMap = new Map(); // primary user id -> recipe user id[]
let accountToLink = new Map(); // recipe user id -> primary user id
function mockCanCreatePrimaryUser(recipeUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield mockGetUser({ userId: recipeUserId.getAsString() });
        if (user === undefined) {
            throw new Error("User does not exist");
        }
        if (user.isPrimaryUser) {
            if (user.id === recipeUserId.getAsString()) {
                return {
                    status: "OK",
                    wasAlreadyAPrimaryUser: true,
                };
            } else {
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR",
                    primaryUserId: user.id,
                    description: "This user ID is already linked to another user ID",
                };
            }
        }
        let email = user.loginMethods[0].email;
        if (email !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    email,
                },
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's email is already associated with another user ID",
                    };
                }
            }
        }
        let phoneNumber = user.loginMethods[0].phoneNumber;
        if (phoneNumber !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    phoneNumber,
                },
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's phone number is already associated with another user ID",
                    };
                }
            }
        }
        let thirdParty = user.loginMethods[0].thirdParty;
        if (thirdParty !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    thirdParty,
                },
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's third party info is already associated with another user ID",
                    };
                }
            }
        }
        return {
            status: "OK",
            wasAlreadyAPrimaryUser: false,
        };
    });
}
exports.mockCanCreatePrimaryUser = mockCanCreatePrimaryUser;
function mockCreatePrimaryUser(recipeUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let canCreateResult = yield mockCanCreatePrimaryUser(recipeUserId);
        if (canCreateResult.status !== "OK") {
            return canCreateResult;
        }
        primaryUserMap.set(recipeUserId.getAsString(), [recipeUserId]);
        accountToLink.delete(recipeUserId.getAsString());
        return {
            status: "OK",
            user: yield mockGetUser({ userId: recipeUserId.getAsString() }),
            wasAlreadyAPrimaryUser: false,
        };
    });
}
exports.mockCreatePrimaryUser = mockCreatePrimaryUser;
function mockGetUsers(querier, input) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: needs to take into account primaryUserMap table.
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
                        recipeUserId: new recipeUserId_1.default(user.id),
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
        toJson: function () {
            return Object.assign(Object.assign({}, this), {
                loginMethods: this.loginMethods.map((lM) => {
                    return Object.assign(Object.assign({}, lM), { recipeUserId: lM.recipeUserId.getAsString() });
                }),
            });
        },
    });
}
exports.createUserObject = createUserObject;
function isEmailVerified(userId, email) {
    return __awaiter(this, void 0, void 0, function* () {
        if (email === undefined) {
            return true;
        }
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
                    let user = yield mockGetUser({ userId: response.data.user.id });
                    user.normalizedInputMap = normalizedInputMap;
                    let userAlreadyAdded = false;
                    for (let u of users) {
                        if (u.id === user.id) {
                            userAlreadyAdded = true;
                            break;
                        }
                    }
                    if (!userAlreadyAdded) {
                        users.push(user);
                    }
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
                        let user = yield mockGetUser({ userId: response.data.users[i].id });
                        user.normalizedInputMap = normalizedInputMap;
                        let userAlreadyAdded = false;
                        for (let u of users) {
                            if (u.id === user.id) {
                                userAlreadyAdded = true;
                                break;
                            }
                        }
                        if (!userAlreadyAdded) {
                            users.push(user);
                        }
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
                    let user = yield mockGetUser({ userId: response.data.user.id });
                    user.normalizedInputMap = normalizedInputMap;
                    let userAlreadyAdded = false;
                    for (let u of users) {
                        if (u.id === user.id) {
                            userAlreadyAdded = true;
                            break;
                        }
                    }
                    if (!userAlreadyAdded) {
                        users.push(user);
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
                    let user = yield mockGetUser({ userId: response.data.user.id });
                    user.normalizedInputMap = normalizedInputMap;
                    let userAlreadyAdded = false;
                    for (let u of users) {
                        if (u.id === user.id) {
                            userAlreadyAdded = true;
                            break;
                        }
                    }
                    if (!userAlreadyAdded) {
                        users.push(user);
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
                    let user = yield mockGetUser({ userId: response.data.user.id });
                    user.normalizedInputMap = normalizedInputMap;
                    let userAlreadyAdded = false;
                    for (let u of users) {
                        if (u.id === user.id) {
                            userAlreadyAdded = true;
                            break;
                        }
                    }
                    if (!userAlreadyAdded) {
                        users.push(user);
                    }
                }
            }
        }
        return users;
    });
}
exports.mockListUsersByAccountInfo = mockListUsersByAccountInfo;
function getPrimaryUserForUserId(userId) {
    let allPrimaryUsers = primaryUserMap.keys();
    for (let pUser in allPrimaryUsers) {
        let recipeUserIds = primaryUserMap.get(pUser);
        if (recipeUserIds !== undefined) {
            for (let i = 0; i < recipeUserIds.length; i++) {
                if (recipeUserIds[i].getAsString() === userId) {
                    return pUser;
                }
            }
        }
    }
    return userId;
}
function mockGetUser({ userId, normalizedInputMap }) {
    return __awaiter(this, void 0, void 0, function* () {
        normalizedInputMap = normalizedInputMap === undefined ? {} : normalizedInputMap;
        userId = getPrimaryUserForUserId(userId);
        let allRecipeUserIds = primaryUserMap.get(userId);
        const isPrimaryUser = allRecipeUserIds !== undefined;
        if (allRecipeUserIds === undefined) {
            // login method will still have this user.
            allRecipeUserIds = [new recipeUserId_1.default(userId)];
        }
        let finalResult = {
            id: userId,
            isPrimaryUser,
            timeJoined: 9684609700828,
            emails: [],
            phoneNumbers: [],
            thirdParty: [],
            normalizedInputMap,
            loginMethods: [],
        };
        for (let i = 0; i < allRecipeUserIds.length; i++) {
            let currUser = allRecipeUserIds[i].getAsString();
            // email password
            {
                let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                    headers: {
                        rid: "emailpassword",
                    },
                });
                if (response.data.status === "OK") {
                    let user = response.data.user;
                    let verified = yield isEmailVerified(user.id, user.email);
                    finalResult.loginMethods.push({
                        recipeId: "emailpassword",
                        recipeUserId: new recipeUserId_1.default(user.id),
                        timeJoined: user.timeJoined,
                        verified,
                        email: user.email,
                    });
                    finalResult.emails.push(user.email);
                    finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                }
            }
            // third party
            {
                let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                    headers: {
                        rid: "thirdparty",
                    },
                });
                if (response.data.status === "OK") {
                    let user = response.data.user;
                    let verified = yield isEmailVerified(user.id, user.email);
                    finalResult.loginMethods.push({
                        recipeId: "thirdparty",
                        recipeUserId: new recipeUserId_1.default(user.id),
                        timeJoined: user.timeJoined,
                        verified,
                        email: user.email,
                        thirdParty: user.thirdParty,
                    });
                    finalResult.emails.push(user.email);
                    finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                    finalResult.thirdParty.push(user.thirdParty);
                }
            }
            // passwordless
            {
                let response = yield axios_1.default.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                    headers: {
                        rid: "passwordless",
                    },
                });
                if (response.data.status === "OK") {
                    let user = response.data.user;
                    let verified = yield isEmailVerified(user.id, user.email);
                    finalResult.loginMethods.push({
                        recipeId: "passwordless",
                        recipeUserId: new recipeUserId_1.default(user.id),
                        timeJoined: user.timeJoined,
                        verified,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                    });
                    if (user.email !== undefined) {
                        finalResult.emails.push(user.email);
                    }
                    if (user.phoneNumber !== undefined) {
                        finalResult.phoneNumbers.push(user.phoneNumber);
                    }
                    finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                }
            }
        }
        if (finalResult.loginMethods.length === 0) {
            return undefined;
        }
        return createUserObject(finalResult);
    });
}
exports.mockGetUser = mockGetUser;
function mockFetchFromAccountToLinkTable(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return accountToLink.get(input.recipeUserId.getAsString());
    });
}
exports.mockFetchFromAccountToLinkTable = mockFetchFromAccountToLinkTable;
