import { AccountInfo } from "./types";
import type { User } from "../../types";
import axios from "axios";

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
            let response = await axios.get(`http://localhost:8080/recipe/users/by-email?email=${accountInfo.email}`, {
                headers: {
                    rid: "thirdparty",
                },
            });
            if (response.data.status === "OK") {
                for (let i = 0; i < response.data.users.length; i++) {
                    let user = response.data.users[i];
                    let verified = await isEmailVerified(user.id, user.email);
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
            let response = await axios.get(`http://localhost:8080/recipe/user?email=${accountInfo.email}`, {
                headers: {
                    rid: "passwordless",
                },
            });
            if (response.data.status === "OK") {
                for (let i = 0; i < response.data.users.length; i++) {
                    let user = response.data.users[i];
                    let verified = await isEmailVerified(user.id, user.email);
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
            let response = await axios.get(`http://localhost:8080/recipe/user?phoneNumber=${accountInfo.phoneNumber}`, {
                headers: {
                    rid: "passwordless",
                },
            });
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
}

export async function mockGetUser({ userId }: { userId: string }): Promise<User | undefined> {
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
        let response = await axios.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
            headers: {
                rid: "thirdparty",
            },
        });
        if (response.data.status === "OK") {
            let user = response.data.user;
            let verified = await isEmailVerified(user.id, user.email);
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
        let response = await axios.get(`http://localhost:8080/recipe/user?userId=${userId}`, {
            headers: {
                rid: "passwordless",
            },
        });
        if (response.data.status === "OK") {
            for (let i = 0; i < response.data.users.length; i++) {
                let user = response.data.users[i];
                let verified = await isEmailVerified(user.id, user.email);
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
}

export async function mockFetchFromAccountToLinkTable(_: { recipeUserId: string }): Promise<string | undefined> {
    return undefined;
}
