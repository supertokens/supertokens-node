import { APIFunction } from "../../types";
import STError from "../../../../error";
import RecipeUserId from "../../../../recipeUserId";

type Response =
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };

export const userPasswordPut = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    const newPassword = requestBody.newPassword;

    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (newPassword === undefined || typeof newPassword !== "string") {
        throw new STError({
            message: "Required parameter 'newPassword' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const emailpasswordRecipe = stInstance.getRecipeInstanceOrThrow("emailpassword");
    const updateResponse = await emailpasswordRecipe.recipeInterfaceImpl.updateEmailOrPassword({
        recipeUserId: new RecipeUserId(recipeUserId),
        password: newPassword,
        tenantIdForPasswordPolicy: tenantId,
        userContext,
    });

    if (
        updateResponse.status === "UNKNOWN_USER_ID_ERROR" ||
        updateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
        updateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR"
    ) {
        // Techincally it can but its an edge case so we assume that it wont
        throw new Error("Should never come here");
    } else if (updateResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
        return {
            status: "INVALID_PASSWORD_ERROR",
            error: updateResponse.failureReason,
        };
    }
    return {
        status: "OK",
    };
};
