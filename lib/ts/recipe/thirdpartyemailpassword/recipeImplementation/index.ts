import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedEP from "./emailPasswordRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";

export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    thirdPartyQuerier?: Querier
): RecipeInterface {
    let originalEmailPasswordImplementation = EmailPasswordImplemenation(emailPasswordQuerier);
    let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier);
    }

    return {
        signUp: async function (input: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await originalEmailPasswordImplementation.signUp.bind(DerivedEP(this))(input);
        },

        signIn: async function (input: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return originalEmailPasswordImplementation.signIn.bind(DerivedEP(this))(input);
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
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input);
        },

        getUserById: async function (input: { userId: string }): Promise<User | undefined> {
            let user: User | undefined = await originalEmailPasswordImplementation.getUserById.bind(DerivedEP(this))(
                input
            );
            if (user !== undefined) {
                return user;
            }
            if (originalThirdPartyImplementation === undefined) {
                return undefined;
            }
            return await originalThirdPartyImplementation.getUserById.bind(DerivedTP(this))(input);
        },

        getUsersByEmail: async function ({ email }: { email: string }): Promise<User[]> {
            let userFromEmailPass: User | undefined = await originalEmailPasswordImplementation.getUserByEmail.bind(
                DerivedEP(this)
            )({ email });

            if (originalThirdPartyImplementation === undefined) {
                return userFromEmailPass === undefined ? [] : [userFromEmailPass];
            }
            let usersFromThirdParty: User[] = await originalThirdPartyImplementation.getUsersByEmail.bind(
                DerivedTP(this)
            )({ email });

            if (userFromEmailPass !== undefined) {
                return [...usersFromThirdParty, userFromEmailPass];
            }
            return usersFromThirdParty;
        },

        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
        }): Promise<User | undefined> {
            if (originalThirdPartyImplementation === undefined) {
                return undefined;
            }
            return originalThirdPartyImplementation.getUserByThirdPartyInfo.bind(DerivedTP(this))(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return originalEmailPasswordImplementation.createResetPasswordToken.bind(DerivedEP(this))(input);
        },

        resetPasswordUsingToken: async function (input: { token: string; newPassword: string }) {
            return originalEmailPasswordImplementation.resetPasswordUsingToken.bind(DerivedEP(this))(input);
        },

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
        }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return originalEmailPasswordImplementation.updateEmailOrPassword.bind(DerivedEP(this))(input);
        },
    };
}
