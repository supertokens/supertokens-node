// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIInterface, APIOptions, TypeProvider } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static getProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext?: any
    ): Promise<TypeProvider | undefined>;
    static manuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: import("../../types").User;
              recipeUserId: import("../..").RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
    >;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let getProvider: typeof Wrapper.getProvider;
export declare let manuallyCreateOrUpdateUser: typeof Wrapper.manuallyCreateOrUpdateUser;
export type { RecipeInterface, APIInterface, APIOptions, TypeProvider };
