// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
declare type Response =
    | {
          status: "OK";
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PASSWORD_VALIDATION_ERROR";
          message: string;
      };
export declare const createEmailPasswordUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
) => Promise<Response>;
export {};
