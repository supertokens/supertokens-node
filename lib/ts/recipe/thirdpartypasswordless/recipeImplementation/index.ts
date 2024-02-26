import { RecipeInterface } from "../types";
import PasswordlessImplemenation from "../../passwordless/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface, TypeProvider } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedPwdless from "./passwordlessRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";
import { User, UserContext } from "../../../types";
import { RecipeUserId, getUser } from "../../../";
import { ProviderInput } from "../../thirdparty/types";
import { SessionContainerInterface } from "../../session/types";

export default function getRecipeInterface(
    passwordlessQuerier: Querier,
    thirdPartyQuerier: Querier,
    providers: ProviderInput[] = []
): RecipeInterface {
    let originalPasswordlessImplementation = PasswordlessImplemenation(passwordlessQuerier);
    let originalThirdPartyImplementation: ThirdPartyRecipeInterface = ThirdPartyImplemenation(
        thirdPartyQuerier,
        providers
    );

    return {
        consumeCode: async function (input) {
            return originalPasswordlessImplementation.consumeCode.bind(DerivedPwdless(this))(input);
        },
        verifyCode: async function (input) {
            return originalPasswordlessImplementation.verifyCode.bind(DerivedPwdless(this))(input);
        },
        createCode: async function (input) {
            return originalPasswordlessImplementation.createCode.bind(DerivedPwdless(this))(input);
        },
        createNewCodeForDevice: async function (input) {
            return originalPasswordlessImplementation.createNewCodeForDevice.bind(DerivedPwdless(this))(input);
        },
        listCodesByDeviceId: async function (input) {
            return originalPasswordlessImplementation.listCodesByDeviceId.bind(DerivedPwdless(this))(input);
        },
        listCodesByEmail: async function (input) {
            return originalPasswordlessImplementation.listCodesByEmail.bind(DerivedPwdless(this))(input);
        },
        listCodesByPhoneNumber: async function (input) {
            return originalPasswordlessImplementation.listCodesByPhoneNumber.bind(DerivedPwdless(this))(input);
        },
        listCodesByPreAuthSessionId: async function (input) {
            return originalPasswordlessImplementation.listCodesByPreAuthSessionId.bind(DerivedPwdless(this))(input);
        },
        revokeAllCodes: async function (input) {
            return originalPasswordlessImplementation.revokeAllCodes.bind(DerivedPwdless(this))(input);
        },
        revokeCode: async function (input) {
            return originalPasswordlessImplementation.revokeCode.bind(DerivedPwdless(this))(input);
        },

        updatePasswordlessUser: async function (this: RecipeInterface, input) {
            let user = await getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            let inputUserIdIsPointingToPasswordlessUser =
                user.loginMethods.find((lM) => {
                    return (
                        lM.recipeId === "passwordless" &&
                        lM.recipeUserId.getAsString() === input.recipeUserId.getAsString()
                    );
                }) !== undefined;

            if (!inputUserIdIsPointingToPasswordlessUser) {
                throw new Error(
                    "Cannot update a user who signed up using third party login using updatePasswordlessUser."
                );
            }

            return originalPasswordlessImplementation.updateUser.bind(DerivedPwdless(this))(input);
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
            session: SessionContainerInterface | undefined;
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
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
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
            session: SessionContainerInterface | undefined;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
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
    };
}
