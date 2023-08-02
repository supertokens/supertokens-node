import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";
import AccountLinking from "../accountlinking/recipe";
import { RecipeInterface } from "./types";

export const mockConsumeCode: RecipeInterface["consumeCode"] = async function (input) {
    let resp;
    try {
        resp = await fetch("http://localhost:8080/recipe/signinup/code/consume", {
            method: "POST",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            body: JSON.stringify(copyAndRemoveUserContext(input)),
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

    const respBody = await resp.json();
    if (respBody.status !== "OK") {
        return respBody;
    }

    const user = respBody.user;
    if (respBody.createdNewUser) {
        respBody.user = createUserObject({
            id: user.id,
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            emails: user.email ? [user.email] : [],
            phoneNumbers: user.phoneNumber ? [user.phoneNumber] : [],
            thirdParty: [],
            loginMethods: [
                {
                    recipeId: "passwordless",
                    recipeUserId: new RecipeUserId(user.id),
                    timeJoined: user.timeJoined,
                    verified: true,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    tenantIds: user.tenantIds,
                },
            ],
        });
    } else {
        respBody.user = (await mockGetUser({
            userId: respBody.user.id,
        }))!;
    }
    return respBody;
};
export const mockCreateCode: RecipeInterface["createCode"] = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/code", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
export const mockCreateNewCodeForDevice: RecipeInterface["createNewCodeForDevice"] = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/code", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
export const mockListCodesByDeviceId: RecipeInterface["listCodesByDeviceId"] = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
export const mockListCodesByEmail: RecipeInterface["listCodesByEmail"] = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
export const mockListCodesByPhoneNumber: RecipeInterface["listCodesByPhoneNumber"] = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
export const mockListCodesByPreAuthSessionId: RecipeInterface["listCodesByPreAuthSessionId"] = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};

export const mockRevokeCode: RecipeInterface["revokeCode"] = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/code/remove", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
export const mockRevokeAllCodes: RecipeInterface["revokeAllCodes"] = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/codes/remove", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
export const mockUpdateUser: RecipeInterface["updateUser"] = async function (input) {
    if (input.email !== null) {
        let user = await AccountLinking.getInstance().recipeInterfaceImpl.getUser({
            userId: input.recipeUserId.getAsString(),
            userContext: {},
        });

        if (user !== undefined && user.isPrimaryUser) {
            let existingUsersWithNewEmail = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo(
                {
                    accountInfo: {
                        email: input.email,
                    },
                    doUnionOfAccountInfo: false,
                    userContext: {},
                }
            );
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
        const resp = await fetch("http://localhost:8080/recipe/user", {
            method: "PUT",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            body: JSON.stringify(
                copyAndRemoveUserContext({
                    ...input,
                    userId: input.recipeUserId.getAsString(),
                })
            ),
        });
        const respBody = await resp.json();
        return respBody;
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
};

function copyAndRemoveUserContext(input: any): any {
    let result = {
        ...input,
    };
    delete result.userContext;
    return result;
}
