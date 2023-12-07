// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
declare type Response =
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
          status: "FEATURE_NOT_ENABLED_ERROR";
      };
export declare const createThridPartyUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<Response>;
export {};
