import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedEP from "./emailPasswordRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";
import { TypeNormalisedInput } from "../../emailpassword/types";

export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput,
    thirdPartyQuerier?: Querier
): RecipeInterface {
    let originalEmailPasswordImplementation = EmailPasswordImplemenation(emailPasswordQuerier, getEmailPasswordConfig);
    let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier);
    }

    return {
        emailPasswordSignUp: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await originalEmailPasswordImplementation.signUp.bind(DerivedEP(this))(input);
        },

        emailPasswordSignIn: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return originalEmailPasswordImplementation.signIn.bind(DerivedEP(this))(input);
        },

        thirdPartySignInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input);
        },

        getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
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

        getUsersByEmail: async function ({ email, userContext }: { email: string; userContext: any }): Promise<User[]> {
            let userFromEmailPass: User | undefined = await originalEmailPasswordImplementation.getUserByEmail.bind(
                DerivedEP(this)
            )({ email, userContext });

            if (originalThirdPartyImplementation === undefined) {
                return userFromEmailPass === undefined ? [] : [userFromEmailPass];
            }
            let usersFromThirdParty: User[] = await originalThirdPartyImplementation.getUsersByEmail.bind(
                DerivedTP(this)
            )({ email, userContext });

            if (userFromEmailPass !== undefined) {
                return [...usersFromThirdParty, userFromEmailPass];
            }
            return usersFromThirdParty;
        },

        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            userContext: any;
        }): Promise<User | undefined> {
            if (originalThirdPartyImplementation === undefined) {
                return undefined;
            }
            return originalThirdPartyImplementation.getUserByThirdPartyInfo.bind(DerivedTP(this))(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
            userContext: any;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return originalEmailPasswordImplementation.createResetPasswordToken.bind(DerivedEP(this))(input);
        },

        resetPasswordUsingToken: async function (input: {
            token: string;
            newPassword: string;
            applyPasswordPolicy?: boolean;
            userContext: any;
        }) {
            return originalEmailPasswordImplementation.resetPasswordUsingToken.bind(DerivedEP(this))(input);
        },

        updateEmailOrPassword: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                email?: string;
                password?: string;
                userContext: any;
                applyPasswordPolicy?: boolean;
            }
        ): Promise<
            | {
                  status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
        > {
            let user = await this.getUserById({ userId: input.userId, userContext: input.userContext });
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            } else if (user.thirdParty !== undefined) {
                throw new Error("Cannot update email or password of a user who signed up using third party login.");
            }
            return originalEmailPasswordImplementation.updateEmailOrPassword.bind(DerivedEP(this))(input);
        },
    };
}
