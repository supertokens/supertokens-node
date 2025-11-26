// @ts-nocheck
import { APIFunction } from "../../../types";
import type { User } from "../../../../../types";
import type RecipeUserId from "../../../../../recipeUserId";
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
export declare const createPasswordlessUser: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
