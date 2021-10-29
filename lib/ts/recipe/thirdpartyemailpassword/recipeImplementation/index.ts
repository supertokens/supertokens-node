import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../../thirdparty";
import { Querier } from "../../../querier";

export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    thirdPartyQuerier?: Querier
): RecipeInterface {
    let emailPasswordImplementation = EmailPasswordImplemenation(emailPasswordQuerier);
    let thirdPartyImplementation: undefined | ThirdPartyRecipeInterface;
    if (thirdPartyQuerier !== undefined) {
        thirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier);
    }
    return {
        signUp: async function (input: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await emailPasswordImplementation.signUp(input);
        },

        signIn: async function (input: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return emailPasswordImplementation.signIn(input);
        },

        signInUp: async function (input: {
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
        > {
            if (thirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return thirdPartyImplementation.signInUp(input);
        },

        getUserById: async function (input: { userId: string }): Promise<User | undefined> {
            let user: User | undefined = await emailPasswordImplementation.getUserById(input);
            if (user !== undefined) {
                return user;
            }
            if (thirdPartyImplementation === undefined) {
                return undefined;
            }
            return await thirdPartyImplementation.getUserById(input);
        },

        getUsersByEmail: async function ({ email }: { email: string }): Promise<User[]> {
            let userFromEmailPass: User | undefined = await emailPasswordImplementation.getUserByEmail({ email });

            if (thirdPartyImplementation === undefined) {
                return userFromEmailPass === undefined ? [] : [userFromEmailPass];
            }
            let usersFromThirdParty: User[] = await thirdPartyImplementation.getUsersByEmail({ email });

            if (userFromEmailPass !== undefined) {
                return [...usersFromThirdParty, userFromEmailPass];
            }
            return usersFromThirdParty;
        },

        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
        }): Promise<User | undefined> {
            if (thirdPartyImplementation === undefined) {
                return undefined;
            }
            return thirdPartyImplementation.getUserByThirdPartyInfo(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return emailPasswordImplementation.createResetPasswordToken(input);
        },

        resetPasswordUsingToken: async function (input: { token: string; newPassword: string }) {
            return emailPasswordImplementation.resetPasswordUsingToken(input);
        },

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
        }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return emailPasswordImplementation.updateEmailOrPassword(input);
        },
    };
}
