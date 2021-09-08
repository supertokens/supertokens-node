import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { extractPaginationTokens, combinePaginationResults } from "../utils";
import { Querier } from "../../../querier";
import { maxVersion } from "../../../utils";

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

    getUsersByEmail = async ({ email }: { email: string }): Promise<User[]> => {
        let userFromEmailPass: User | undefined = await this.emailPasswordImplementation.getUserByEmail({ email });

        if (this.thirdPartyImplementation === undefined) {
            return userFromEmailPass === undefined ? [] : [userFromEmailPass];
        }
        let thirdpartyQuerierAPIVersion = await this.thirdPartyImplementation.querier.getAPIVersion();
        if (maxVersion(thirdpartyQuerierAPIVersion, "2.8") !== thirdpartyQuerierAPIVersion) {
            return userFromEmailPass === undefined ? [] : [userFromEmailPass];
        }
        let usersFromThirdParty: User[] = await this.thirdPartyImplementation.getUsersByEmail({ email });

        if (userFromEmailPass !== undefined) {
            return [...usersFromThirdParty, userFromEmailPass];
        }
        return usersFromThirdParty;
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

    /**
     * @deprecated Please do not override this function
     *   */
    getUserByEmail = async (input: { email: string }): Promise<User | undefined> => {
        return this.emailPasswordImplementation.getUserByEmail(input);
    };

    createResetPasswordToken = async (input: {
        userId: string;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> => {
        return this.emailPasswordImplementation.createResetPasswordToken(input);
    };

    resetPasswordUsingToken = async (input: { token: string; newPassword: string }) => {
        return this.emailPasswordImplementation.resetPasswordUsingToken(input);
    };

    /**
     * @deprecated Please do not override this function
     *   */
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

    /**
     * @deprecated Please do not override this function
     *   */
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

    /**
     * @deprecated Please do not override this function
     *   */
    getUserCount = async () => {
        let promise1 = this.emailPasswordImplementation.getUserCount();
        let promise2 = this.thirdPartyImplementation !== undefined ? this.thirdPartyImplementation.getUserCount() : 0;
        return (await promise1) + (await promise2);
    };

    updateEmailOrPassword = async (input: {
        userId: string;
        email?: string;
        password?: string;
    }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        return this.emailPasswordImplementation.updateEmailOrPassword(input);
    };
}
