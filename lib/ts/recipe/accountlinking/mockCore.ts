import { AccountInfo, RecipeLevelUser } from "./types";
import type { User } from "../../types";
import axios from "axios";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

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

    // this is there so that when we fetch users based on certain identifiers
    // like email or phone number, we add the normalized version of these to the map
    // so that further filtering is not buggy.
    normalizedInputMap: { [key: string]: string | undefined };
};

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
    const normalizedInputMap: { [key: string]: string } = {};
    if (input.query?.email !== undefined) {
        let splitted = input.query.email.split(";");
        for (let s of splitted) {
            normalizedInputMap[s] = s.toLowerCase().trim();
        }
    }
    if (input.query?.phone !== undefined) {
        let splitted = input.query.phone.split(";");
        for (let s of splitted) {
            normalizedInputMap[s] = s.toLowerCase().trim();
        }
    }
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
}

export function createUserObject(input: UserWithoutHelperFunctions): User {
    function getHasSameEmailAs(lM: RecipeLevelUser) {
        function hasSameEmailAs(email: string | undefined): boolean {
            if (email === undefined) {
                return false;
            }
            let normalisedEmail = input.normalizedInputMap[email] ?? email;
            return lM.email !== undefined && lM.email === normalisedEmail;
        }
        return hasSameEmailAs;
    }

    function getHasSamePhoneNumberAs(lM: RecipeLevelUser) {
        function hasSamePhoneNumberAs(phoneNumber: string | undefined): boolean {
            if (phoneNumber === undefined) {
                return false;
            }
            let normalisedPhoneNumber = input.normalizedInputMap[phoneNumber] ?? phoneNumber;
            return lM.phoneNumber !== undefined && lM.phoneNumber === normalisedPhoneNumber;
        }
        return hasSamePhoneNumberAs;
    }

    function getHasSameThirdPartyInfoAs(lM: RecipeLevelUser) {
        function hasSameThirdPartyInfoAs(thirdParty?: { id: string; userId: string }): boolean {
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
    };
}

async function isEmailVerified(userId: string, email: string): Promise<boolean> {
    let response = await axios.get(`http://localhost:8080/recipe/user/email/verify?userId=${userId}&email=${email}`, {
        headers: {
            rid: "emailverification",
        },
    });
    return response.data.status === "OK" && response.data.isVerified;
}

export async function mockListUsersByAccountInfo({ accountInfo }: { accountInfo: AccountInfo }): Promise<User[]> {
    let users: User[] = [];

    // we want to provide all the normalized inputs to the user
    const normalizedInputMap: { [key: string]: string } = {};
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
            let response = await axios.get(`http://localhost:8080/recipe/user?email=${accountInfo.email}`, {
                headers: {
                    rid: "emailpassword",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);
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
            let response = await axios.get(`http://localhost:8080/recipe/users/by-email?email=${accountInfo.email}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            if (response.data.status === "OK") {
                for (let i = 0; i < response.data.users.length; i++) {
                    let user = response.data.users[i];
                    let verified = await isEmailVerified(user.id, user.email);
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
            let response = await axios.get(`http://localhost:8080/recipe/user?email=${accountInfo.email}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);
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

    if (accountInfo.phoneNumber !== undefined) {
        // passwordless
        {
            let response = await axios.get(`http://localhost:8080/recipe/user?phoneNumber=${accountInfo.phoneNumber}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                let user = response.data.user;
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
                let user = response.data.user;
                let verified = await isEmailVerified(user.id, user.email);
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
}

export async function mockGetUser({ userId }: { userId: string }): Promise<User | undefined> {
    const normalizedInputMap: { [key: string]: string } = {};

    // email password
    {
        let response = await axios.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
            headers: {
                rid: "emailpassword",
            },
        });
        if (response.data.status === "OK") {
            let user = response.data.user;
            let verified = await isEmailVerified(user.id, user.email);
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
        let response = await axios.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
            headers: {
                rid: "thirdparty",
            },
        });
        if (response.data.status === "OK") {
            let user = response.data.user;
            let verified = await isEmailVerified(user.id, user.email);
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
        let response = await axios.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
            headers: {
                rid: "passwordless",
            },
        });
        if (response.data.status === "OK") {
            let user = response.data.user;
            let verified = await isEmailVerified(user.id, user.email);
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

    return undefined;
}

export async function mockFetchFromAccountToLinkTable(_: { recipeUserId: string }): Promise<string | undefined> {
    return undefined;
}
