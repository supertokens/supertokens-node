// @ts-nocheck
import type { User } from "../../types";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
export declare function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: string,
    querier: Querier
): Promise<
    | {
          status: "OK";
          createdNewUser: boolean;
          user: User;
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
>;
export declare function mockSignIn(input: {
    email: string;
    password: string;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | {
          status: "WRONG_CREDENTIALS_ERROR";
      }
>;
export declare function mockCreateRecipeUser(input: {
    email: string;
    password: string;
    userContext: any;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
>;
export declare function mockUpdateEmailOrPassword(input: {
    recipeUserId: RecipeUserId;
    email?: string;
    password?: string;
    applyPasswordPolicy?: boolean;
    isAccountLinkingEnabled: boolean;
    querier: Querier;
}): Promise<
    | {
          status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
    | {
          status: "PASSWORD_POLICY_VIOLATED_ERROR";
          failureReason: string;
      }
>;
