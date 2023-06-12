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
exports.mockStoreIntoAccountToLinkTable = exports.mockFetchFromAccountToLinkTable = exports.mockDeleteUser = exports.mockUnlinkAccount = exports.mockGetUser = exports.mockListUsersByAccountInfo = exports.createUserObject = exports.mockGetUsers = exports.mockCreatePrimaryUser = exports.mockCanCreatePrimaryUser = exports.mockLinkAccounts = exports.mockCanLinkAccounts = exports.mockReset = void 0;
const axios_1 = __importDefault(require("axios"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const session_1 = __importDefault(require("../session"));
const max_1 = __importDefault(require("libphonenumber-js/max"));
let primaryUserMap = new Map(); // primary user id -> recipe user id[]
let accountToLink = new Map(); // recipe user id -> primary user id
function mockReset() {
    return __awaiter(this, void 0, void 0, function* () {
        primaryUserMap = new Map();
        accountToLink = new Map();
    });
}
exports.mockReset = mockReset;
function mockCanLinkAccounts({ recipeUserId, primaryUserId }) {
    return __awaiter(this, void 0, void 0, function* () {
        let primaryUser = yield mockGetUser({ userId: primaryUserId });
        if (primaryUser === undefined) {
            throw new Error("Primary user does not exist");
        }
        let recipeUser = yield mockGetUser({ userId: recipeUserId.getAsString() });
        if (recipeUser === undefined) {
            throw new Error("Recipe user does not exist");
        }
        if (recipeUser.isPrimaryUser) {
            if (recipeUser.id === primaryUserId) {
                return {
                    status: "OK",
                    accountsAlreadyLinked: true,
                };
            } else {
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId: recipeUser.id,
                    description: "This user ID is already linked to another user ID",
                };
            }
        }
        let email = recipeUser.loginMethods[0].email;
        if (email !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    if (user.id === primaryUserId) {
                        return {
                            status: "OK",
                            accountsAlreadyLinked: false,
                        };
                    }
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's email is already associated with another user ID",
                    };
                }
            }
        }
        let phoneNumber = recipeUser.loginMethods[0].phoneNumber;
        if (phoneNumber !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    phoneNumber,
                },
                doUnionOfAccountInfo: false,
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    if (user.id === primaryUserId) {
                        return {
                            status: "OK",
                            accountsAlreadyLinked: false,
                        };
                    }
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's phone number is already associated with another user ID",
                    };
                }
            }
        }
        let thirdParty = recipeUser.loginMethods[0].thirdParty;
        if (thirdParty !== undefined) {
            let users = yield mockListUsersByAccountInfo({
                accountInfo: {
                    thirdParty,
                },
                doUnionOfAccountInfo: false,
            });
            for (let user of users) {
                if (user.isPrimaryUser) {
                    if (user.id === primaryUserId) {
                        return {
                            status: "OK",
                            accountsAlreadyLinked: false,
                        };
                    }
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
            accountsAlreadyLinked: false,
        };
    });
}
exports.mockCanLinkAccounts = mockCanLinkAccounts;
function mockLinkAccounts({ recipeUserId, primaryUserId }) {
    return __awaiter(this, void 0, void 0, function* () {
        let canLinkAccounts = yield mockCanLinkAccounts({
            recipeUserId,
            primaryUserId,
        });
        if (canLinkAccounts.status !== "OK" || canLinkAccounts.accountsAlreadyLinked) {
            return canLinkAccounts;
        }
        let existing = primaryUserMap.get(primaryUserId);
        if (existing === undefined) {
            existing = [];
        }
        existing.push(recipeUserId);
        primaryUserMap.set(primaryUserId, existing);
        accountToLink.delete(recipeUserId.getAsString());
        yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
        return {
            status: "OK",
            accountsAlreadyLinked: false,
        };
    });
}
exports.mockLinkAccounts = mockLinkAccounts;
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
                doUnionOfAccountInfo: false,
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
                doUnionOfAccountInfo: false,
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
                doUnionOfAccountInfo: false,
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
        let wasAlreadyAPrimaryUser = false;
        if (primaryUserMap.has(recipeUserId.getAsString())) {
            wasAlreadyAPrimaryUser = true;
        } else {
            primaryUserMap.set(recipeUserId.getAsString(), [recipeUserId]);
            accountToLink.delete(recipeUserId.getAsString());
        }
        return {
            status: "OK",
            user: yield mockGetUser({ userId: recipeUserId.getAsString() }),
            wasAlreadyAPrimaryUser,
        };
    });
}
exports.mockCreatePrimaryUser = mockCreatePrimaryUser;
function mockGetUsers(querier, input) {
    return __awaiter(this, void 0, void 0, function* () {
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
            if (email === undefined) {
                return false;
            }
            // this needs to be the same as what's done in the core.
            email = email.toLowerCase().trim();
            return lM.email !== undefined && lM.email === email;
        }
        return hasSameEmailAs;
    }
    function getHasSamePhoneNumberAs(lM) {
        function hasSamePhoneNumberAs(phoneNumber) {
            if (phoneNumber === undefined) {
                return false;
            }
            const parsedPhoneNumber = max_1.default(phoneNumber);
            if (parsedPhoneNumber === undefined) {
                // this means that the phone number is not valid according to the E.164 standard.
                // but we still just trim it.
                phoneNumber = phoneNumber.trim();
            } else {
                phoneNumber = parsedPhoneNumber.format("E.164");
            }
            return lM.phoneNumber !== undefined && lM.phoneNumber === phoneNumber;
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
    // remove duplicate items from the input.emails array
    input.emails = input.emails.filter((email, index) => {
        return input.emails.indexOf(email) === index;
    });
    // remove duplicate items from the input.phoneNumbers array
    input.phoneNumbers = input.phoneNumbers.filter((phoneNumber, index) => {
        return input.phoneNumbers.indexOf(phoneNumber) === index;
    });
    // remove duplicate items from the input.thirdParty array
    input.thirdParty = input.thirdParty.filter((thirdParty, index) => {
        let indexFound = index;
        for (let i = 0; i < input.thirdParty.length; i++) {
            if (input.thirdParty[i].id === thirdParty.id && input.thirdParty[i].userId === thirdParty.userId) {
                indexFound = i;
                break;
            }
        }
        return indexFound === index;
    });
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
function mockListUsersByAccountInfo({ accountInfo, doUnionOfAccountInfo }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (
            accountInfo.email === undefined &&
            accountInfo.phoneNumber === undefined &&
            accountInfo.thirdParty === undefined
        ) {
            throw new Error("Please pass at least one account info field");
        }
        let users = [];
        if (accountInfo.email !== undefined) {
            // email password
            {
                let response = yield axios_1.default.get(
                    `http://localhost:8080/recipe/user?email=${encodeURIComponent(accountInfo.email)}`,
                    {
                        headers: {
                            rid: "emailpassword",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    let user = yield mockGetUser({ userId: response.data.user.id });
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
                    `http://localhost:8080/recipe/user?phoneNumber=${encodeURIComponent(accountInfo.phoneNumber)}`,
                    {
                        headers: {
                            rid: "passwordless",
                        },
                    }
                );
                if (response.data.status === "OK") {
                    let user = yield mockGetUser({ userId: response.data.user.id });
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
        if (!doUnionOfAccountInfo) {
            users = users.filter((u) => {
                let pass = true;
                if (accountInfo.email !== undefined) {
                    if (
                        u.loginMethods.find((lM) => {
                            return lM.hasSameEmailAs(accountInfo.email);
                        }) === undefined
                    ) {
                        pass = false;
                    }
                }
                if (accountInfo.phoneNumber !== undefined) {
                    if (
                        u.loginMethods.find((lM) => {
                            return lM.hasSamePhoneNumberAs(accountInfo.phoneNumber);
                        }) === undefined
                    ) {
                        pass = false;
                    }
                }
                if (accountInfo.thirdParty !== undefined) {
                    if (
                        u.loginMethods.find((lM) => {
                            return lM.hasSameThirdPartyInfoAs(accountInfo.thirdParty);
                        }) === undefined
                    ) {
                        pass = false;
                    }
                }
                return pass;
            });
        }
        return users;
    });
}
exports.mockListUsersByAccountInfo = mockListUsersByAccountInfo;
function getPrimaryUserForUserId(userId) {
    for (let [pUser, recipeUserIds] of primaryUserMap) {
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
function mockGetUser({ userId }) {
    return __awaiter(this, void 0, void 0, function* () {
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
function mockUnlinkAccount({ recipeUserId, querier }) {
    return __awaiter(this, void 0, void 0, function* () {
        let primaryUser = yield mockGetUser({ userId: recipeUserId.getAsString() });
        if (primaryUser === undefined) {
            throw new Error("Input user not found");
        }
        if (!primaryUser.isPrimaryUser) {
            throw new Error("Input user is not linked with any user");
        }
        if (primaryUser.id === recipeUserId.getAsString()) {
            let existingList = primaryUserMap.get(primaryUser.id);
            if (existingList !== undefined) {
                if (existingList.length === 1) {
                    primaryUserMap.delete(primaryUser.id);
                    for (const [recipeUserId, primaryUserId] of accountToLink) {
                        if (primaryUserId === primaryUser.id) {
                            accountToLink.delete(recipeUserId);
                        }
                    }
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
                } else {
                    existingList = existingList.filter((u) => u.getAsString() !== recipeUserId.getAsString());
                    primaryUserMap.set(primaryUser.id, existingList);
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
                    yield mockDeleteUser({
                        userId: recipeUserId.getAsString(),
                        removeAllLinkedAccounts: false,
                        querier,
                    });
                    return {
                        status: "OK",
                        wasRecipeUserDeleted: true,
                    };
                }
            }
        } else {
            let existingList = primaryUserMap.get(primaryUser.id);
            if (existingList !== undefined) {
                existingList = existingList.filter((u) => u.getAsString() !== recipeUserId.getAsString());
                primaryUserMap.set(primaryUser.id, existingList);
                yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
            }
        }
        return {
            status: "OK",
            wasRecipeUserDeleted: false,
        };
    });
}
exports.mockUnlinkAccount = mockUnlinkAccount;
function mockDeleteUser({ userId, removeAllLinkedAccounts, querier }) {
    return __awaiter(this, void 0, void 0, function* () {
        let primaryUser = yield mockGetUser({ userId });
        if (primaryUser === undefined) {
            return {
                status: "OK",
            };
        }
        let allRecipeIdsToDelete = [];
        if (removeAllLinkedAccounts) {
            if (primaryUser.isPrimaryUser) {
                allRecipeIdsToDelete = primaryUserMap.get(userId).map((u) => u.getAsString());
            } else {
                allRecipeIdsToDelete = [userId];
            }
        } else {
            allRecipeIdsToDelete = [userId];
        }
        for (let i = 0; i < allRecipeIdsToDelete.length; i++) {
            yield querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                userId: allRecipeIdsToDelete[i],
            });
            let existingUsers = primaryUserMap.get(primaryUser.id);
            if (existingUsers === undefined) {
                existingUsers = [];
            }
            existingUsers = existingUsers.filter((u) => u.getAsString() !== allRecipeIdsToDelete[i]);
            if (existingUsers.length === 0) {
                primaryUserMap.delete(primaryUser.id);
            } else {
                // NOTE: We are actually supposed to not delete the metadata stuff for the primary user
                // here cause there are still linked users (see lucid chart diagram). But
                // this is controlled by the core, so we can't do anything here whilst mocking
                primaryUserMap.set(primaryUser.id, existingUsers);
            }
        }
        return {
            status: "OK",
        };
    });
}
exports.mockDeleteUser = mockDeleteUser;
function mockFetchFromAccountToLinkTable(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let recipeUser = yield mockGetUser({ userId: input.recipeUserId.getAsString() });
        if (recipeUser === undefined || recipeUser.isPrimaryUser) {
            accountToLink.delete(input.recipeUserId.getAsString());
            return undefined;
        }
        let primaryUserId = accountToLink.get(input.recipeUserId.getAsString());
        if (primaryUserId === undefined) {
            return undefined;
        }
        let primaryUser = yield mockGetUser({ userId: primaryUserId });
        if (primaryUser === undefined) {
            accountToLink.delete(input.recipeUserId.getAsString());
            return undefined;
        }
        if (!primaryUser.isPrimaryUser) {
            for (const [recipeUserId, primaryUserId] of accountToLink) {
                if (primaryUserId === primaryUser.id) {
                    accountToLink.delete(recipeUserId);
                }
            }
            return undefined;
        }
        return primaryUserId;
    });
}
exports.mockFetchFromAccountToLinkTable = mockFetchFromAccountToLinkTable;
function mockStoreIntoAccountToLinkTable(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let recipeUser = yield mockGetUser({ userId: input.recipeUserId.getAsString() });
        if (recipeUser === undefined) {
            throw new Error("Input recipeUser does not exist");
        }
        if (recipeUser.isPrimaryUser) {
            return {
                status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR",
                primaryUserId: recipeUser.id,
            };
        }
        let primaryUser = yield mockGetUser({ userId: input.primaryUserId });
        if (primaryUser === undefined) {
            throw new Error("Input primaryUser does not exist");
        }
        if (!primaryUser.isPrimaryUser) {
            return {
                status: "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR",
            };
        }
        let existingPrimaryUserId = accountToLink.get(input.recipeUserId.getAsString());
        if (existingPrimaryUserId !== undefined && existingPrimaryUserId === input.primaryUserId) {
            return {
                status: "OK",
                didInsertNewRow: false,
            };
        }
        // this will also override any existing to link entry.
        accountToLink.set(input.recipeUserId.getAsString(), input.primaryUserId);
        return {
            status: "OK",
            didInsertNewRow: true,
        };
    });
}
exports.mockStoreIntoAccountToLinkTable = mockStoreIntoAccountToLinkTable;
