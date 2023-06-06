import type { User } from "../../types";
import axios from "axios";
import { createUserObject, mockGetUser } from "../accountlinking/mockCore";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import AccountLinking from "../accountlinking/recipe";

export async function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: string,
    querier: Querier
): Promise<
    | { status: "OK"; createdNewUser: boolean; user: User }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
> {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
        thirdPartyId,
        thirdPartyUserId,
        email: { id: email },
    });

    return {
        status: "OK",
        createdNewUser: response.createdNewUser,
        user: (await mockGetUser({
            userId: response.user.id,
        }))!,
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
    isAccountLinkingEnabled: boolean;
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

        // if we are doing account linking, then we do the check below regardless of
        //if the current user is primary one or not. This is to prevent the following attack scenario:
        // - attacker creates account with email "A" which they do not verify (even though they own the email).
        // - victim signs up with email "V" using google, and that is not a primary user.
        // - attacker changes their email to "V", which shoots an email verification email to the victim.
        // - the victim thinks that they are getting an email verification email for their google account, and clicks on it.
        // - the victim's account is now compromised cause the attacker's account is now linked to
        // the victim's account.
        // To prevent this, we disallow the attacker's account to change the email in the first place
        // even though their account is still just a recipe level account.
        if (user !== undefined && (user.isPrimaryUser || input.isAccountLinkingEnabled)) {
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
