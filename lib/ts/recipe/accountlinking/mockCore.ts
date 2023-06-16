import { AccountInfo, RecipeLevelUser } from "./types";
import type { User } from "../../types";
import axios from "axios";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeUserId from "../../recipeUserId";
import Session from "../session";
import parsePhoneNumber from "libphonenumber-js/max";

type UserWithoutHelperFunctions = {
    id: string; // primaryUserId or recipeUserId
    timeJoined: number; // minimum timeJoined value from linkedRecipes
    isPrimaryUser: boolean;
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
    })[];
};

let primaryUserMap: Map<string, RecipeUserId[]> = new Map(); // primary user id -> recipe user id[]

let accountToLink: Map<string, string> = new Map(); // recipe user id -> primary user id

export async function mockReset() {
    primaryUserMap = new Map();
    accountToLink = new Map();
}

export async function mockCanLinkAccounts({
    recipeUserId,
    primaryUserId,
}: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
    | {
          status: "OK";
          accountsAlreadyLinked: boolean;
      }
    | {
          status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
    | {
          status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
    | {
          status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
      }
> {
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
        let users = await mockListUsersByAccountInfo({
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
        let users = await mockListUsersByAccountInfo({
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
}

export async function mockLinkAccounts({
    recipeUserId,
    primaryUserId,
}: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
    | {
          status: "OK";
          accountsAlreadyLinked: boolean;
      }
    | {
          status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
    | {
          status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
    | {
          status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
      }
> {
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

    await Session.revokeAllSessionsForUser(recipeUserId.getAsString(), false);

    return {
        status: "OK",
        accountsAlreadyLinked: false,
    };
}

export async function mockCanCreatePrimaryUser(
    recipeUserId: RecipeUserId
): Promise<
    | {
          status: "OK";
          wasAlreadyAPrimaryUser: boolean;
      }
    | {
          status:
              | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
              | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
> {
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

export async function mockCreatePrimaryUser(
    recipeUserId: RecipeUserId
): Promise<
    | {
          status: "OK";
          user: User;
          wasAlreadyAPrimaryUser: boolean;
      }
    | {
          status:
              | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
              | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
          description: string;
      }
> {
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
        user: (await mockGetUser({ userId: recipeUserId.getAsString() }))!,
        wasAlreadyAPrimaryUser,
    };
}

export async function mockGetUsers(
    querier: Querier,
    input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: { [key: string]: string };
    }
): Promise<{
    users: User[];
    nextPaginationToken?: string;
}> {
    let includeRecipeIdsStr = undefined;
    if (input.includeRecipeIds !== undefined) {
        includeRecipeIdsStr = input.includeRecipeIds.join(",");
    }
    let response = await querier.sendGetRequest(new NormalisedURLPath("/users"), {
        includeRecipeIds: includeRecipeIdsStr,
        timeJoinedOrder: input.timeJoinedOrder,
        limit: input.limit,
        paginationToken: input.paginationToken,
        ...input.query,
    });
    let users: User[] = [];
    for (let userObj of response.users) {
        let user = userObj.user;
        let verified = true;
        if (user.email !== undefined) {
            verified = await isEmailVerified(user.id, user.email);
        }
        let userWithoutHelperFunctions: UserWithoutHelperFunctions = {
            id: user.id,
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            emails: user.email === undefined ? [] : [user.email],
            phoneNumbers: user.phoneNumber === undefined ? [] : [user.phoneNumber],
            thirdParty: user.thirdParty === undefined ? [] : [user.thirdParty],
            loginMethods: [
                {
                    recipeId: userObj.recipeId,
                    recipeUserId: new RecipeUserId(user.id),
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
}

export function createUserObject(input: UserWithoutHelperFunctions): User {
    function getHasSameEmailAs(lM: RecipeLevelUser) {
        function hasSameEmailAs(email: string | undefined): boolean {
            if (email === undefined) {
                return false;
            }
            // this needs to be the same as what's done in the core.
            email = email.toLowerCase().trim();
            return lM.email !== undefined && lM.email === email;
        }
        return hasSameEmailAs;
    }

    function getHasSamePhoneNumberAs(lM: RecipeLevelUser) {
        function hasSamePhoneNumberAs(phoneNumber: string | undefined): boolean {
            if (phoneNumber === undefined) {
                return false;
            }
            const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
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

    function getHasSameThirdPartyInfoAs(lM: RecipeLevelUser) {
        function hasSameThirdPartyInfoAs(thirdParty?: { id: string; userId: string }): boolean {
            if (thirdParty === undefined) {
                return false;
            }
            thirdParty.id = thirdParty.id.trim();
            thirdParty.userId = thirdParty.userId.trim();
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

    return {
        ...input,
        loginMethods: input.loginMethods.map((lM) => {
            return {
                ...lM,
                hasSameEmailAs: getHasSameEmailAs(lM),
                hasSamePhoneNumberAs: getHasSamePhoneNumberAs(lM),
                hasSameThirdPartyInfoAs: getHasSameThirdPartyInfoAs(lM),
            };
        }),
        toJson: function () {
            return {
                ...this,
                loginMethods: this.loginMethods.map((lM: any) => {
                    return {
                        ...lM,
                        recipeUserId: lM.recipeUserId.getAsString(),
                    };
                }),
            };
        },
    };
}

async function isEmailVerified(userId: string, email: string | undefined): Promise<boolean> {
    if (email === undefined) {
        return true;
    }
    let response = await axios.get(`http://localhost:8080/recipe/user/email/verify?userId=${userId}&email=${email}`, {
        headers: {
            rid: "emailverification",
        },
    });
    return response.data.status === "OK" && response.data.isVerified;
}

export async function mockListUsersByAccountInfo({
    accountInfo,
    doUnionOfAccountInfo,
}: {
    accountInfo: AccountInfo;
    doUnionOfAccountInfo: boolean;
}): Promise<User[]> {
    if (
        accountInfo.email === undefined &&
        accountInfo.phoneNumber === undefined &&
        accountInfo.thirdParty === undefined
    ) {
        throw new Error("Please pass at least one account info field");
    }
    let users: User[] = [];
    if (accountInfo.email !== undefined) {
        // email password
        {
            let response = await axios.get(
                `http://localhost:8080/recipe/user?email=${encodeURIComponent(accountInfo.email)}`,
                {
                    headers: {
                        rid: "emailpassword",
                    },
                }
            );
            if (response.data.status === "OK") {
                let user = (await mockGetUser({ userId: response.data.user.id }))!;
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
            let response = await axios.get(`http://localhost:8080/recipe/users/by-email?email=${accountInfo.email}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            if (response.data.status === "OK") {
                for (let i = 0; i < response.data.users.length; i++) {
                    let user = (await mockGetUser({ userId: response.data.users[i].id }))!;
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
            let response = await axios.get(`http://localhost:8080/recipe/user?email=${accountInfo.email}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                let user = (await mockGetUser({ userId: response.data.user.id }))!;
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
            let response = await axios.get(
                `http://localhost:8080/recipe/user?phoneNumber=${encodeURIComponent(accountInfo.phoneNumber)}`,
                {
                    headers: {
                        rid: "passwordless",
                    },
                }
            );
            if (response.data.status === "OK") {
                let user = (await mockGetUser({ userId: response.data.user.id }))!;
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
            let response = await axios.get(
                `http://localhost:8080/recipe/user?thirdPartyId=${accountInfo.thirdParty.id}&thirdPartyUserId=${accountInfo.thirdParty.userId}`,
                {
                    headers: {
                        rid: "thirdparty",
                    },
                }
            );
            if (response.data.status === "OK") {
                let user = (await mockGetUser({ userId: response.data.user.id }))!;
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

function getPrimaryUserForUserId(userId: string): string {
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

export async function mockGetUser({ userId }: { userId: string }): Promise<User | undefined> {
    userId = getPrimaryUserForUserId(userId);

    let allRecipeUserIds = primaryUserMap.get(userId);

    const isPrimaryUser = allRecipeUserIds !== undefined;

    if (allRecipeUserIds === undefined) {
        // login method will still have this user.
        allRecipeUserIds = [new RecipeUserId(userId)];
    }

    let finalResult: UserWithoutHelperFunctions = {
        id: userId,
        isPrimaryUser,
        timeJoined: 9684609700828, // this is there cause we get the min from the loop below.
        emails: [],
        phoneNumbers: [],
        thirdParty: [],
        loginMethods: [],
    };

    for (let i = 0; i < allRecipeUserIds.length; i++) {
        let currUser = allRecipeUserIds[i].getAsString();
        // email password
        {
            let response = await axios.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "emailpassword",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);
                finalResult.loginMethods.push({
                    recipeId: "emailpassword",
                    recipeUserId: new RecipeUserId(user.id),
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
            let response = await axios.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);
                finalResult.loginMethods.push({
                    recipeId: "thirdparty",
                    recipeUserId: new RecipeUserId(user.id),
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
            let response = await axios.get(`http://localhost:8080/recipe/user?userId=${currUser}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);

                finalResult.loginMethods.push({
                    recipeId: "passwordless",
                    recipeUserId: new RecipeUserId(user.id),
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
}

export async function mockUnlinkAccount({
    recipeUserId,
    querier,
}: {
    recipeUserId: RecipeUserId;
    querier: Querier;
}): Promise<{
    status: "OK";
    wasRecipeUserDeleted: boolean;
}> {
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
                await Session.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
            } else {
                existingList = existingList.filter((u) => u.getAsString() !== recipeUserId.getAsString());
                primaryUserMap.set(primaryUser.id, existingList);
                await Session.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
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
            await Session.revokeAllSessionsForUser(recipeUserId.getAsString(), false);
        }
    }
    return {
        status: "OK",
        wasRecipeUserDeleted: false,
    };
}

export async function mockDeleteUser({
    userId,
    removeAllLinkedAccounts,
    querier,
}: {
    userId: string;
    removeAllLinkedAccounts: boolean;
    querier: Querier;
}): Promise<{
    status: "OK";
}> {
    let primaryUser = await mockGetUser({ userId });
    if (primaryUser === undefined) {
        return {
            status: "OK",
        };
    }
    let allRecipeIdsToDelete: string[] = [];
    if (removeAllLinkedAccounts) {
        if (primaryUser.isPrimaryUser) {
            allRecipeIdsToDelete = primaryUserMap.get(userId)!.map((u) => u.getAsString());
        } else {
            allRecipeIdsToDelete = [userId];
        }
    } else {
        allRecipeIdsToDelete = [userId];
    }

    for (let i = 0; i < allRecipeIdsToDelete.length; i++) {
        await querier.sendPostRequest(new NormalisedURLPath("/user/remove"), {
            userId: allRecipeIdsToDelete[i],
        });

        let existingUsers = primaryUserMap.get(primaryUser.id)!;
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

export async function mockFetchFromAccountToLinkTable(input: {
    recipeUserId: RecipeUserId;
}): Promise<string | undefined> {
    let recipeUser = await mockGetUser({ userId: input.recipeUserId.getAsString() });
    if (recipeUser === undefined || recipeUser.isPrimaryUser) {
        accountToLink.delete(input.recipeUserId.getAsString());
        return undefined;
    }

    let primaryUserId = accountToLink.get(input.recipeUserId.getAsString());

    if (primaryUserId === undefined) {
        return undefined;
    }

    let primaryUser = await mockGetUser({ userId: primaryUserId });
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
}

export async function mockStoreIntoAccountToLinkTable(input: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
    | {
          status: "OK";
          didInsertNewRow: boolean;
      }
    | {
          status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
      }
    | {
          status: "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR";
      }
> {
    let recipeUser = await mockGetUser({ userId: input.recipeUserId.getAsString() });
    if (recipeUser === undefined) {
        throw new Error("Input recipeUser does not exist");
    }

    if (recipeUser.isPrimaryUser) {
        return {
            status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR",
            primaryUserId: recipeUser.id,
        };
    }

    let primaryUser = await mockGetUser({ userId: input.primaryUserId });
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
}
