import type { User } from "../../types";
import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import AccountLinking from "../accountlinking/recipe";

let passwordResetTokens: { [key: string]: { userId: string; email: string } } = {};

export async function mockReset() {
    passwordResetTokens = {};
}

export async function mockCreatePasswordResetToken(
    email: string,
    userId: string,
    tenantId: string
): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
    let response = await fetch(`http://localhost:8080/${tenantId ?? "public"}/recipe/user/password/reset/token`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email,
            userId,
        }),
    });
    if (response.status !== 200) {
        throw new Error(await response.text());
    }
    const respBody = await response.json();

    if (respBody.status === "UNKNOWN_USER_ID_ERROR") {
        // this is cause maybe we are trying to use a primary user id..
        let user = await mockGetUser({
            userId,
        });
        if (user !== undefined) {
            respBody.status = "OK";
            respBody.token = (Math.random() + 1).toString(36).substring(7);
        } else {
            return respBody;
        }
    }

    passwordResetTokens[respBody.token] = {
        userId,
        email,
    };
    return {
        status: "OK",
        token: respBody.token,
    };
}

export async function mockConsumePasswordResetToken(
    token: string,
    newPassword: string,
    tenantId: string,
    querier: Querier
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

    const res = await querier.sendPostRequest(
        new NormalisedURLPath(`/${tenantId ?? "public"}/recipe/user/password/reset`),
        {
            method: "token",
            token,
            newPassword,
        }
    );

    if (res.status !== "OK") {
        return res;
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
    tenantId: string;
}): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
    let response = await fetch(`http://localhost:8080/${input.tenantId ?? "public"}/recipe/signin`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email: input.email,
            password: input.password,
        }),
    });
    const respBody = await response.json();

    if (respBody.status === "WRONG_CREDENTIALS_ERROR") {
        return respBody;
    }

    let user = respBody.user;
    return {
        status: "OK",
        user: (await mockGetUser({
            userId: user.id,
        }))!,
    };
}

export async function mockCreateRecipeUser(input: {
    tenantId?: string;
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
    let response = await fetch(`http://localhost:8080/${input.tenantId ?? "public"}/recipe/signup`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email: input.email,
            password: input.password,
        }),
    });
    const respBody = await response.json();
    console.log(respBody);
    if (respBody.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return respBody;
    }

    let user = respBody.user;
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
                    tenantIds: user.tenantIds,
                },
            ],
        }),
    };
}

export async function mockUpdateEmailOrPassword(input: {
    recipeUserId: RecipeUserId;
    email?: string;
    password?: string;
    applyPasswordPolicy?: boolean;
    querier: Querier;
}): Promise<
    | {
          status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
    | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
> {
    if (input.email !== undefined) {
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

    let response = await input.querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
        userId: input.recipeUserId.getAsString(),
        email: input.email,
        password: input.password,
    });

    return response;
}
