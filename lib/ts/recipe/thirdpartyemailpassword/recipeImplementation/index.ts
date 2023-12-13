import { RecipeInterface } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface, TypeProvider } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedEP from "./emailPasswordRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";
import { getUser } from "../../../";
import { User, UserContext } from "../../../types";
import RecipeUserId from "../../../recipeUserId";

import { TypeNormalisedInput } from "../../emailpassword/types";
import { ProviderInput } from "../../thirdparty/types";

export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput,
    thirdPartyQuerier: Querier,
    providers: ProviderInput[] = []
): RecipeInterface {
    let originalEmailPasswordImplementation = EmailPasswordImplemenation(emailPasswordQuerier, getEmailPasswordConfig);
    let originalThirdPartyImplementation: ThirdPartyRecipeInterface = ThirdPartyImplemenation(
        thirdPartyQuerier,
        providers
    );

    return {
        createNewEmailPasswordRecipeUser: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId; isValidFirstFactorForTenant: boolean | undefined }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            return await originalEmailPasswordImplementation.createNewRecipeUser.bind(DerivedEP(this))(input);
        },
        emailPasswordSignUp: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId; isValidFirstFactorForTenant: boolean | undefined }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            return await originalEmailPasswordImplementation.signUp.bind(DerivedEP(this))(input);
        },

        emailPasswordSignIn: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId; isValidFirstFactorForTenant: boolean | undefined }
            | { status: "WRONG_CREDENTIALS_ERROR" }
        > {
            return originalEmailPasswordImplementation.signIn.bind(DerivedEP(this))(input);
        },

        thirdPartySignInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: User;
                  recipeUserId: RecipeUserId;
                  oAuthTokens: { [key: string]: any };
                  rawUserInfoFromProvider: {
                      fromIdTokenPayload?: { [key: string]: any };
                      fromUserInfoAPI?: { [key: string]: any };
                  };
                  isValidFirstFactorForTenant: boolean | undefined;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input);
        },

        thirdPartyManuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: User;
                  recipeUserId: RecipeUserId;
                  isValidFirstFactorForTenant: boolean | undefined;
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            return originalThirdPartyImplementation.manuallyCreateOrUpdateUser.bind(DerivedTP(this))(input);
        },

        thirdPartyGetProvider: async function (input: {
            thirdPartyId: string;
            clientType?: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<TypeProvider | undefined> {
            return originalThirdPartyImplementation.getProvider.bind(DerivedTP(this))(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
            email: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return originalEmailPasswordImplementation.createResetPasswordToken.bind(DerivedEP(this))(input);
        },

        consumePasswordResetToken: async function (input: {
            token: string;
            tenantId: string;
            userContext: UserContext;
        }) {
            return originalEmailPasswordImplementation.consumePasswordResetToken.bind(DerivedEP(this))(input);
        },

        updateEmailOrPassword: async function (
            this: RecipeInterface,
            input: {
                recipeUserId: RecipeUserId;
                email?: string;
                password?: string;
                userContext: UserContext;
                applyPasswordPolicy?: boolean;
                tenantIdForPasswordPolicy: string;
            }
        ): Promise<
            | {
                  status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
        > {
            let user = await getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            let inputUserIdIsPointingToEmailPasswordUser =
                user.loginMethods.find((lM) => {
                    return (
                        lM.recipeId === "emailpassword" &&
                        lM.recipeUserId.getAsString() === input.recipeUserId.getAsString()
                    );
                }) !== undefined;

            if (!inputUserIdIsPointingToEmailPasswordUser) {
                throw new Error("Cannot update email or password of a user who signed up using third party login.");
            }
            return originalEmailPasswordImplementation.updateEmailOrPassword.bind(DerivedEP(this))(input);
        },
    };
}
