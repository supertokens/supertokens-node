// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
type Response =
    | {
          status: string;
          createdNewRecipeUser: boolean;
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PHONE_VALIDATION_ERROR";
          message: string;
      };
export declare const createPasswordlessUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<Response>;
export {};
