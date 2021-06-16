import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { extractPaginationTokens, combinePaginationResults } from "../utils";
import { Querier } from "../../../querier";

export default class RecipeImplementation implements RecipeInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;

    constructor(emailPasswordQuerier: Querier, thirdPartyQuerier?: Querier) {
        this.emailPasswordImplementation = new EmailPasswordImplemenation(emailPasswordQuerier);
        if (thirdPartyQuerier !== undefined) {
            this.thirdPartyImplementation = new ThirdPartyImplemenation(thirdPartyQuerier);
        }
    }

    signUp = async (input: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        return await this.emailPasswordImplementation.signUp(input);
    };

    signIn = async (input: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> => {
        return this.emailPasswordImplementation.signIn(input);
    };

    signInUp = async (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    > => {
        if (this.thirdPartyImplementation === undefined) {
            throw new Error("No thirdparty provider configured");
        }
        return this.thirdPartyImplementation.signInUp(input);
    };

    getUserById = async (input: { userId: string }): Promise<User | undefined> => {
        let user: User | undefined = await this.emailPasswordImplementation.getUserById(input);
        if (user !== undefined) {
            return user;
        }
        if (this.thirdPartyImplementation === undefined) {
            return undefined;
        }
        return await this.thirdPartyImplementation.getUserById(input);
    };

    getUserByThirdPartyInfo = async (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
    }): Promise<User | undefined> => {
        if (this.thirdPartyImplementation === undefined) {
            return undefined;
        }
        return this.thirdPartyImplementation.getUserByThirdPartyInfo(input);
    };

    getEmailForUserId = async (input: { userId: string }) => {
        let userInfo = await this.getUserById(input);
        if (userInfo === undefined) {
            throw new Error("Unknown User ID provided");
        }
        return userInfo.email;
    };

    getUserByEmail = async (input: { email: string }): Promise<User | undefined> => {
        return this.emailPasswordImplementation.getUserByEmail(input);
    };

    createResetPasswordToken = async (input: {
        userId: string;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID" }> => {
        return this.emailPasswordImplementation.createResetPasswordToken(input);
    };

    resetPasswordUsingToken = async (input: { token: string; newPassword: string }) => {
        return this.emailPasswordImplementation.resetPasswordUsingToken(input);
    };

    getUsersOldestFirst = async ({
        limit,
        nextPaginationTokenString,
    }: {
        limit?: number;
        nextPaginationTokenString?: string;
    }) => {
        limit = limit === undefined ? 100 : limit;
        let nextPaginationTokens: {
            thirdPartyPaginationToken: string | undefined;
            emailPasswordPaginationToken: string | undefined;
        } = {
            thirdPartyPaginationToken: undefined,
            emailPasswordPaginationToken: undefined,
        };
        if (nextPaginationTokenString !== undefined) {
            nextPaginationTokens = extractPaginationTokens(nextPaginationTokenString);
        }
        let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersOldestFirst({
            limit,
            nextPaginationToken: nextPaginationTokens.emailPasswordPaginationToken,
        });
        let thirdPartyResultPromise =
            this.thirdPartyImplementation === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyImplementation.getUsersOldestFirst({
                      limit,
                      nextPaginationToken: nextPaginationTokens.thirdPartyPaginationToken,
                  });
        let emailPasswordResult = await emailPasswordResultPromise;
        let thirdPartyResult = await thirdPartyResultPromise;
        return combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
    };

    getUsersNewestFirst = async ({
        limit,
        nextPaginationTokenString,
    }: {
        limit?: number;
        nextPaginationTokenString?: string;
    }) => {
        limit = limit === undefined ? 100 : limit;
        let nextPaginationTokens: {
            thirdPartyPaginationToken: string | undefined;
            emailPasswordPaginationToken: string | undefined;
        } = {
            thirdPartyPaginationToken: undefined,
            emailPasswordPaginationToken: undefined,
        };
        if (nextPaginationTokenString !== undefined) {
            nextPaginationTokens = extractPaginationTokens(nextPaginationTokenString);
        }
        let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersNewestFirst({
            limit,
            nextPaginationToken: nextPaginationTokens.emailPasswordPaginationToken,
        });
        let thirdPartyResultPromise =
            this.thirdPartyImplementation === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyImplementation.getUsersNewestFirst({
                      limit,
                      nextPaginationToken: nextPaginationTokens.thirdPartyPaginationToken,
                  });
        let emailPasswordResult = await emailPasswordResultPromise;
        let thirdPartyResult = await thirdPartyResultPromise;
        return combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, false);
    };

    getUserCount = async () => {
        let promise1 = this.emailPasswordImplementation.getUserCount();
        let promise2 = this.thirdPartyImplementation !== undefined ? this.thirdPartyImplementation.getUserCount() : 0;
        return (await promise1) + (await promise2);
    };
}
