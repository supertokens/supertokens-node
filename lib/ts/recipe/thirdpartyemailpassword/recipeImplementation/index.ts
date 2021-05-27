import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import STError from "../error";
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

    signUp = async (
        email: string,
        password: string
    ): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        return await this.emailPasswordImplementation.signUp(email, password);
    };

    signIn = async (
        email: string,
        password: string
    ): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> => {
        return this.emailPasswordImplementation.signIn(email, password);
    };

    signInUp = async (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }> => {
        if (this.thirdPartyImplementation === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("No thirdparty provider configured"),
            });
        }
        return this.thirdPartyImplementation.signInUp(thirdPartyId, thirdPartyUserId, email);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let user: User | undefined = await this.emailPasswordImplementation.getUserById(userId);
        if (user !== undefined) {
            return user;
        }
        if (this.thirdPartyImplementation === undefined) {
            return undefined;
        }
        return await this.thirdPartyImplementation.getUserById(userId);
    };

    getUserByThirdPartyInfo = async (thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> => {
        if (this.thirdPartyImplementation === undefined) {
            return undefined;
        }
        return this.thirdPartyImplementation.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
    };

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.getUserById(userId);
        if (userInfo === undefined) {
            throw new Error("Unknown User ID provided");
        }
        return userInfo.email;
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return this.emailPasswordImplementation.getUserByEmail(email);
    };

    createResetPasswordToken = async (
        userId: string
    ): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID" }> => {
        return this.emailPasswordImplementation.createResetPasswordToken(userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return this.emailPasswordImplementation.resetPasswordUsingToken(token, newPassword);
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationTokenString?: string) => {
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
        let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersOldestFirst(
            limit,
            nextPaginationTokens.emailPasswordPaginationToken
        );
        let thirdPartyResultPromise =
            this.thirdPartyImplementation === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyImplementation.getUsersOldestFirst(
                      limit,
                      nextPaginationTokens.thirdPartyPaginationToken
                  );
        let emailPasswordResult = await emailPasswordResultPromise;
        let thirdPartyResult = await thirdPartyResultPromise;
        return combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationTokenString?: string) => {
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
        let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersNewestFirst(
            limit,
            nextPaginationTokens.emailPasswordPaginationToken
        );
        let thirdPartyResultPromise =
            this.thirdPartyImplementation === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyImplementation.getUsersNewestFirst(
                      limit,
                      nextPaginationTokens.thirdPartyPaginationToken
                  );
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
