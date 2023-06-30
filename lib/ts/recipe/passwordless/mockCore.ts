import axios from "axios";
import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";
import AccountLinking from "../accountlinking/recipe";
import { RecipeInterface } from "./types";

const baseURL = "http://localhost:8080/";
export const mockConsumeCode: RecipeInterface["consumeCode"] = async function (input) {
    let resp;
    try {
        resp = await axios("/recipe/signinup/code/consume", {
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
        resp.data.user = createUserObject({
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
                },
            ],
        });
    } else {
        resp.data.user = (await mockGetUser({
            userId: resp.data.user.id,
        }))!;
    }
    return resp.data;
};
export const mockCreateCode: RecipeInterface["createCode"] = async function (input) {
    const resp = await axios("/recipe/signinup/code", {
        method: "POST",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        data: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockCreateNewCodeForDevice: RecipeInterface["createNewCodeForDevice"] = async function (input) {
    const resp = await axios("/recipe/signinup/code", {
        method: "POST",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        data: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockListCodesByDeviceId: RecipeInterface["listCodesByDeviceId"] = async function (input) {
    const resp = await axios("/recipe/signinup/codes", {
        method: "GET",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        params: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockListCodesByEmail: RecipeInterface["listCodesByEmail"] = async function (input) {
    const resp = await axios("/recipe/signinup/codes", {
        method: "GET",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        params: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockListCodesByPhoneNumber: RecipeInterface["listCodesByPhoneNumber"] = async function (input) {
    const resp = await axios("/recipe/signinup/codes", {
        method: "GET",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        params: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockListCodesByPreAuthSessionId: RecipeInterface["listCodesByPreAuthSessionId"] = async function (input) {
    const resp = await axios("/recipe/signinup/codes", {
        method: "GET",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        params: copyAndRemoveUserContext(input),
    });
    return resp.data;
};

export const mockRevokeCode: RecipeInterface["revokeCode"] = async function (input) {
    const resp = await axios("/recipe/signinup/code/remove", {
        method: "POST",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        data: copyAndRemoveUserContext(input),
    });
    return resp.data;
};
export const mockRevokeAllCodes: RecipeInterface["revokeAllCodes"] = async function (input) {
    const resp = await axios("/recipe/signinup/codes/remove", {
        method: "POST",
        baseURL,
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        data: copyAndRemoveUserContext(input),
    });
    return resp.data;
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
        const resp = await axios("/recipe/user", {
            method: "PUT",
            baseURL,
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            data: copyAndRemoveUserContext({
                ...input,
                userId: input.recipeUserId.getAsString(),
            }),
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
};

function copyAndRemoveUserContext(input: any): any {
    let result = {
        ...input,
    };
    delete result.userContext;
    return result;
}
