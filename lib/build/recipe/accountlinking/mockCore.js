"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDeleteUser = exports.mockUnlinkAccount = exports.mockGetUser = exports.mockListUsersByAccountInfo = exports.createUserObject = exports.mockGetUsers = exports.mockCreatePrimaryUser = exports.mockCanCreatePrimaryUser = exports.mockLinkAccounts = exports.mockCanLinkAccounts = exports.mockReset = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const session_1 = __importDefault(require("../session"));
const user_1 = require("../../user");
let primaryUserMap = new Map(); // primary user id -> recipe user id[]
let accountToLink = new Map(); // recipe user id -> primary user id
async function mockReset() {
    primaryUserMap = new Map();
    accountToLink = new Map();
}
exports.mockReset = mockReset;
async function mockCanLinkAccounts({ recipeUserId, primaryUserId }) {
    let primaryUser = await mockGetUser({ userId: primaryUserId });
    if (primaryUser === undefined) {
        throw new Error("Primary user does not exist");
    }
    if (primaryUser.isPrimaryUser === false) {
        return {
            status: "INPUT_USER_IS_NOT_A_PRIMARY_USER",
        };
    }
    let recipeUser = await mockGetUser({ userId: recipeUserId.getAsString() });
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
        let users = await mockListUsersByAccountInfo({
            accountInfo: {
                email,
            },
            doUnionOfAccountInfo: false,
        });
        for (let user of users) {
            if (user.isPrimaryUser) {
                if (user.id !== primaryUserId) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's email is already associated with another user ID",
                    };
                }
            }
        }
    }
    let phoneNumber = recipeUser.loginMethods[0].phoneNumber;
    if (phoneNumber !== undefined) {
        let users = await mockListUsersByAccountInfo({
            accountInfo: {
                phoneNumber,
            },
            doUnionOfAccountInfo: false,
        });
        for (let user of users) {
            if (user.isPrimaryUser) {
                if (user.id !== primaryUserId) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's phone number is already associated with another user ID",
                    };
                }
            }
        }
    }
    let thirdParty = recipeUser.loginMethods[0].thirdParty;
    if (thirdParty !== undefined) {
        let users = await mockListUsersByAccountInfo({
            accountInfo: {
                thirdParty,
            },
            doUnionOfAccountInfo: false,
        });
        for (let user of users) {
            if (user.isPrimaryUser) {
                if (user.id !== primaryUserId) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: user.id,
                        description: "This user's third party info is already associated with another user ID",
                    };
                }
            }
        }
    }
    return {
        status: "OK",
        accountsAlreadyLinked: false,
    };
}
exports.mockCanLinkAccounts = mockCanLinkAccounts;
async function mockLinkAccounts({ recipeUserId, primaryUserId }) {
    let pUser = await mockGetUser({ userId: primaryUserId });
    if (pUser === undefined) {
        throw new Error("Primary user does not exist");
    }
    // we do this cause we want to still link to the primary user even if the input primary user
    // is a recipe user that is linked to some primary user.
    primaryUserId = pUser.id;
    let canLinkAccounts = await mockCanLinkAccounts({
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
    await session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
    return {
        status: "OK",
        accountsAlreadyLinked: false,
    };
}
exports.mockLinkAccounts = mockLinkAccounts;
async function mockCanCreatePrimaryUser(recipeUserId) {
    let user = await mockGetUser({ userId: recipeUserId.getAsString() });
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
        let users = await mockListUsersByAccountInfo({
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
        let users = await mockListUsersByAccountInfo({
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
        let users = await mockListUsersByAccountInfo({
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
}
exports.mockCanCreatePrimaryUser = mockCanCreatePrimaryUser;
async function mockCreatePrimaryUser(recipeUserId) {
    let canCreateResult = await mockCanCreatePrimaryUser(recipeUserId);
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
        user: await mockGetUser({ userId: recipeUserId.getAsString() }),
        wasAlreadyAPrimaryUser,
    };
}
exports.mockCreatePrimaryUser = mockCreatePrimaryUser;
async function mockGetUsers(querier, input) {
    let includeRecipeIdsStr = undefined;
    if (input.includeRecipeIds !== undefined) {
        includeRecipeIdsStr = input.includeRecipeIds.join(",");
    }
    let response = await querier.sendGetRequest(
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
            verified = await isEmailVerified(user.id, user.email);
        }
        let userWithoutHelperFunctions = {
            id: user.id,
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            emails: user.email === undefined ? [] : [user.email],
            phoneNumbers: user.phoneNumber === undefined ? [] : [user.phoneNumber],
            thirdParty: user.thirdParty === undefined ? [] : [user.thirdParty],
            tenantIds: user.tenantIds,
            loginMethods: [
                {
                    recipeId: userObj.recipeId,
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    thirdParty: user.thirdParty,
                    tenantIds: user.tenantIds,
                },
            ],
        };
        users.push(createUserObject(userWithoutHelperFunctions));
    }
    return {
        users: users,
        nextPaginationToken: response.nextPaginationToken,
    };
}
exports.mockGetUsers = mockGetUsers;
function createUserObject(input) {
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
    return new user_1.User(input);
}
exports.createUserObject = createUserObject;
async function isEmailVerified(userId, email) {
    if (email === undefined) {
        return true;
    }
    let response = await fetch(`http://localhost:8080/recipe/user/email/verify?userId=${userId}&email=${email}`, {
        headers: {
            rid: "emailverification",
        },
    });
    const respBody = await response.json();
    return respBody.status === "OK" && respBody.isVerified;
}
async function mockListUsersByAccountInfo({ accountInfo, doUnionOfAccountInfo }) {
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
            let response = await fetch(
                `http://localhost:8080/recipe/user?email=${encodeURIComponent(accountInfo.email)}`,
                {
                    headers: {
                        rid: "emailpassword",
                    },
                }
            );
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = await mockGetUser({ userId: respBody.user.id });
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
            let response = await fetch(`http://localhost:8080/recipe/users/by-email?email=${accountInfo.email}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            const respBody = await response.json();
            if (respBody.status === "OK") {
                for (let i = 0; i < respBody.users.length; i++) {
                    let user = await mockGetUser({ userId: respBody.users[i].id });
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
            let response = await fetch(`http://localhost:8080/recipe/user?email=${accountInfo.email}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = await mockGetUser({ userId: respBody.user.id });
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
            let response = await fetch(
                `http://localhost:8080/recipe/user?phoneNumber=${encodeURIComponent(accountInfo.phoneNumber)}`,
                {
                    headers: {
                        rid: "passwordless",
                    },
                }
            );
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = await mockGetUser({ userId: respBody.user.id });
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
            let response = await fetch(
                `http://localhost:8080/recipe/user?thirdPartyId=${accountInfo.thirdParty.id}&thirdPartyUserId=${accountInfo.thirdParty.userId}`,
                {
                    headers: {
                        rid: "thirdparty",
                    },
                }
            );
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = await mockGetUser({ userId: respBody.user.id });
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
async function mockGetUser({ userId }) {
    userId = getPrimaryUserForUserId(userId);
    let allRecipeUserIds = primaryUserMap.get(userId);
    const isPrimaryUser = allRecipeUserIds !== undefined;
    if (allRecipeUserIds === undefined) {
        // login method will still have this user.
        allRecipeUserIds = [new recipeUserId_1.default(userId)];
    }
    let finalResult = {
        tenantIds: [],
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
            let response = await fetch(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "emailpassword",
                },
            });
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = respBody.user;
                let verified = await isEmailVerified(user.id, user.email);
                finalResult.loginMethods.push({
                    recipeId: "emailpassword",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified,
                    email: user.email,
                    tenantIds: user.tenantIds,
                });
                finalResult.emails.push(user.email);
                finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                finalResult.tenantIds = finalResult.tenantIds.concat(user.tenantIds);
            }
        }
        // third party
        {
            let response = await fetch(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = respBody.user;
                let verified = await isEmailVerified(user.id, user.email);
                finalResult.loginMethods.push({
                    recipeId: "thirdparty",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified,
                    email: user.email,
                    thirdParty: user.thirdParty,
                    tenantIds: user.tenantIds,
                });
                finalResult.emails.push(user.email);
                finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                finalResult.thirdParty.push(user.thirdParty);
                finalResult.tenantIds = finalResult.tenantIds.concat(user.tenantIds);
            }
        }
        // passwordless
        {
            let response = await fetch(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            const respBody = await response.json();
            if (respBody.status === "OK") {
                let user = respBody.user;
                let verified = await isEmailVerified(user.id, user.email);
                finalResult.loginMethods.push({
                    recipeId: "passwordless",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    tenantIds: user.tenantIds,
                });
                if (user.email !== undefined) {
                    finalResult.emails.push(user.email);
                }
                if (user.phoneNumber !== undefined) {
                    finalResult.phoneNumbers.push(user.phoneNumber);
                }
                finalResult.timeJoined = Math.min(finalResult.timeJoined, user.timeJoined);
                finalResult.tenantIds = finalResult.tenantIds.concat(user.tenantIds);
            }
        }
    }
    if (finalResult.loginMethods.length === 0) {
        return undefined;
    }
    return createUserObject(finalResult);
}
exports.mockGetUser = mockGetUser;
async function mockUnlinkAccount({ recipeUserId, querier }) {
    let primaryUser = await mockGetUser({ userId: recipeUserId.getAsString() });
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
                await session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
            } else {
                existingList = existingList.filter((u) => u.getAsString() !== recipeUserId.getAsString());
                primaryUserMap.set(primaryUser.id, existingList);
                await session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
                await mockDeleteUser({
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
            await session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
        }
    }
    return {
        status: "OK",
        wasRecipeUserDeleted: false,
    };
}
exports.mockUnlinkAccount = mockUnlinkAccount;
async function mockDeleteUser({ userId, removeAllLinkedAccounts, querier }) {
    let primaryUser = await mockGetUser({ userId });
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
        await querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
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
}
exports.mockDeleteUser = mockDeleteUser;
