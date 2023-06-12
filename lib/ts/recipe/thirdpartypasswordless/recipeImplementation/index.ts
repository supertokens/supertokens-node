import { RecipeInterface } from "../types";
import PasswordlessImplemenation from "../../passwordless/recipeImplementation";

import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../../thirdparty";
import { Querier } from "../../../querier";
import DerivedPwdless from "./passwordlessRecipeImplementation";
import DerivedTP from "./thirdPartyRecipeImplementation";
import { User as GlobalUser } from "../../../types";
import { getUser } from "../../../";

export default function getRecipeInterface(passwordlessQuerier: Querier, thirdPartyQuerier?: Querier): RecipeInterface {
    let originalPasswordlessImplementation = PasswordlessImplemenation(passwordlessQuerier);
    let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier);
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
            let user = await getUser(input.userId, input.userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            } else if (user.thirdParty.length > 0) {
                // TODO: the above if condition is wrong.
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
            isVerified: boolean;
            attemptAccountLinking: boolean;
            userContext: any;
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: GlobalUser }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input);
        },

        createNewOrUpdateEmailOfThirdPartyRecipeUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            userContext: any;
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: GlobalUser }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
        > {
            if (originalThirdPartyImplementation === undefined) {
                throw new Error("No thirdparty provider configured");
            }
            return originalThirdPartyImplementation.createNewOrUpdateEmailOfRecipeUser.bind(DerivedTP(this))(input);
        },
    };
}
