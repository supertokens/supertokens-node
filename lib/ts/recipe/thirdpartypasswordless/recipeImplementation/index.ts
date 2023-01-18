import { RecipeInterface, User } from "../types";
import PasswordlessImplemenation from "../../passwordless/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface, TypeProvider } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedPwdless from "./passwordlessRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";
import { ProviderInput } from "../../thirdparty/types";

export default function getRecipeInterface(
    passwordlessQuerier: Querier,
    thirdPartyQuerier?: Querier,
    providers: ProviderInput[] = []
): RecipeInterface {
    let originalPasswordlessImplementation = PasswordlessImplemenation(passwordlessQuerier);
    let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier, providers);
    }

    return {
        consumeCode: async function (input) {
            return originalPasswordlessImplementation.consumeCode.bind(DerivedPwdless(this))(input);
        },
        createCode: async function (input) {
            return originalPasswordlessImplementation.createCode.bind(DerivedPwdless(this))(input);
        },
        createNewCodeForDevice: async function (input) {
            return originalPasswordlessImplementation.createNewCodeForDevice.bind(DerivedPwdless(this))(input);
        },
        getUserByPhoneNumber: async function (input) {
            return originalPasswordlessImplementation.getUserByPhoneNumber.bind(DerivedPwdless(this))(input);
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
            let user = await this.getUserById({ userId: input.userId, userContext: input.userContext });
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            } else if ("thirdParty" in user) {
                throw new Error(
                    "Cannot update passwordless user info for those who signed up using third party login."
                );
            }
            return originalPasswordlessImplementation.updateUser.bind(DerivedPwdless(this))(input);
        },

        thirdPartySignInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload: { [key: string]: any };
                fromUserInfoAPI: { [key: string]: any };
            };
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input);
        },

        thirdPartyManuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.manuallyCreateOrUpdateUser.bind(DerivedTP(this))(input);
        },

        thirdPartyGetProvider: async function (input: {
            thirdPartyId: string;
            tenantId?: string;
            clientType?: string;
            userContext: any;
        }): Promise<{ status: "OK"; provider: TypeProvider; thirdPartyEnabled: boolean }> {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.getProvider.bind(DerivedTP(this))(input);
        },

        getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
            let user: User | undefined = await originalPasswordlessImplementation.getUserById.bind(
                DerivedPwdless(this)
            )(input);
            if (user !== undefined) {
                return user;
            }
            if (originalThirdPartyImplementation === undefined) {
                return undefined;
            }
            return await originalThirdPartyImplementation.getUserById.bind(DerivedTP(this))(input);
        },

        getUsersByEmail: async function ({ email, userContext }: { email: string; userContext: any }): Promise<User[]> {
            let userFromEmailPass: User | undefined = await originalPasswordlessImplementation.getUserByEmail.bind(
                DerivedPwdless(this)
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
    };
}
