// @ts-nocheck
import { APIFunction } from "../../../types";
import type { User } from "../../../../../types";
import type RecipeUserId from "../../../../../recipeUserId";
type Response =
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
export declare const createEmailPasswordUser: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
