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
      };
export declare const createEmailPasswordUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<Response>;
export {};
