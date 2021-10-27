import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
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

    createResetPasswordToken = async (input: {
        userId: string;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> => {
        return this.emailPasswordImplementation.createResetPasswordToken(input);
    };

    resetPasswordUsingToken = async (input: { token: string; newPassword: string }) => {
        return this.emailPasswordImplementation.resetPasswordUsingToken(input);
    };

    updateEmailOrPassword = async (input: {
        userId: string;
        email?: string;
        password?: string;
    }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        return this.emailPasswordImplementation.updateEmailOrPassword(input);
    };
}
