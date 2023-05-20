import type { User } from "../../types";
import axios from "axios";
import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";

let passwordResetTokens: { [key: string]: { userId: string; email: string } } = {};

export async function mockCreatePasswordResetToken(
    email: string,
    userId: string
): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
    let response = await axios(`http://localhost:8080/recipe/user/password/reset/token`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        data: {
            email,
            userId,
        },
    });

    if (response.data.status === "UNKNOWN_USER_ID_ERROR") {
        return response.data;
    }

    passwordResetTokens[response.data.token] = {
        userId,
        email,
    };
    return {
        status: "OK",
        token: response.data.token,
    };
}

export async function mockConsumePasswordResetToken(
    token: string
): Promise<
    | {
          status: "OK";
          userId: string;
          email: string;
      }
    | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
> {
    if (passwordResetTokens[token] === undefined) {
        return {
            status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
        };
    }
    let userId = passwordResetTokens[token].userId;
    let email = passwordResetTokens[token].email;
    delete passwordResetTokens[token];
    return {
        status: "OK",
        userId,
        email,
    };
}

export async function mockSignIn(input: {
    email: string;
    password: string;
}): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
    const normalizedInputMap: { [key: string]: string } = {};
    normalizedInputMap[input.email] = input.email.toLowerCase().trim();

    let response = await axios(`http://localhost:8080/recipe/signin`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        data: {
            email: input.email,
            password: input.password,
        },
    });

    if (response.data.status === "WRONG_CREDENTIALS_ERROR") {
        return response.data;
    }

    let user = response.data.user;
    return {
        status: "OK",
        user: (await mockGetUser({
            userId: user.id,
            normalizedInputMap,
        }))!,
    };
}

export async function mockCreateRecipeUser(input: {
    email: string;
    password: string;
    userContext: any;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
> {
    const normalizedInputMap: { [key: string]: string } = {};
    normalizedInputMap[input.email] = input.email.toLowerCase().trim();

    let response = await axios(`http://localhost:8080/recipe/signup`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        data: {
            email: input.email,
            password: input.password,
        },
    });

    if (response.data.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return response.data;
    }

    let user = response.data.user;
    return {
        status: "OK",
        user: createUserObject({
            id: user.id,
            emails: [user.email],
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
                {
                    recipeId: "emailpassword",
                    recipeUserId: new RecipeUserId(user.id),
                    timeJoined: user.timeJoined,
                    verified: false,
                    email: user.email,
                },
            ],
            normalizedInputMap,
        }),
    };
}
