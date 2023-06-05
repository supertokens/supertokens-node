// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIInterface, APIOptions, TypeProvider } from "./types";
import RecipeUserId from "../../recipeUserId";
import { SessionContainerInterface } from "../session/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: import("../emailpassword").User;
          }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
              reason: string;
          }
    >;
    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required.
     */
    static linkThirdPartyAccountWithUserFromSession(input: {
        session: SessionContainerInterface;
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
              reason: string;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: RecipeUserId;
              email: string;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static Google: typeof import("./providers/google").default;
    static Github: typeof import("./providers/github").default;
    static Facebook: typeof import("./providers/facebook").default;
    static Apple: typeof import("./providers/apple").default;
    static Discord: typeof import("./providers/discord").default;
    static GoogleWorkspaces: typeof import("./providers/googleWorkspaces").default;
    static Bitbucket: typeof import("./providers/bitbucket").default;
    static GitLab: typeof import("./providers/gitlab").default;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signInUp: typeof Wrapper.signInUp;
export declare let linkThirdPartyAccountWithUserFromSession: typeof Wrapper.linkThirdPartyAccountWithUserFromSession;
export declare let Google: typeof import("./providers/google").default;
export declare let Github: typeof import("./providers/github").default;
export declare let Facebook: typeof import("./providers/facebook").default;
export declare let Apple: typeof import("./providers/apple").default;
export declare let Discord: typeof import("./providers/discord").default;
export declare let GoogleWorkspaces: typeof import("./providers/googleWorkspaces").default;
export declare let Bitbucket: typeof import("./providers/bitbucket").default;
export declare let GitLab: typeof import("./providers/gitlab").default;
export type { RecipeInterface, APIInterface, APIOptions, TypeProvider };
