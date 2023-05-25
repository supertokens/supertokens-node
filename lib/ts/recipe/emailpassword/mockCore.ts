import type { User } from "../../types";
import axios from "axios";
import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import AccountLinking from "../accountlinking/recipe";

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
        // this is cause maybe we are trying to use a primary user id..
        let user = await mockGetUser({
            userId,
        });
        if (user !== undefined) {
            response.data.status = "OK";
            response.data.token = (Math.random() + 1).toString(36).substring(7);
        } else {
            return response.data;
        }
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
    let shouldMarkEmailVerified = false;
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
                    userContext: {},
                }
            );
            let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
            if (primaryUserForNewEmail.length === 1) {
                if (primaryUserForNewEmail[0].id === user.id) {
                    user.loginMethods.forEach((loginMethod) => {
                        if (loginMethod.hasSameEmailAs(input.email) && loginMethod.verified) {
                            shouldMarkEmailVerified = true;
                        }
                    });
                } else {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason: "New email is already associated with another primary user ID",
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

    if (response.status === "OK" && shouldMarkEmailVerified) {
        let EmailVerification = require("../emailverification");
        try {
            let tokenResp = await EmailVerification.createEmailVerificationToken(input.recipeUserId);
            if (tokenResp.status === "OK") {
                await EmailVerification.verifyEmailUsingToken(tokenResp.token);
            }
        } catch (err) {
            if (err.message === "Initialisation not done. Did you forget to call the SuperTokens.init function?") {
                // this means email verification is not enabled.. So we just ignore.
            } else {
                throw err;
            }
        }
    }

    return response;
}
