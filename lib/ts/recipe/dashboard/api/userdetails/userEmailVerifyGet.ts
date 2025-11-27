import { APIFunction } from "../../types";
import STError from "../../../../error";
import RecipeUserId from "../../../../recipeUserId";

type Response =
    | {
          status: "OK";
          isVerified: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

export const userEmailVerifyGet: APIFunction = async ({ stInstance, options, userContext }): Promise<Response> => {
    const req = options.req;
    const recipeUserId = req.getKeyValueFromQuery("recipeUserId");

    if (recipeUserId === undefined) {
        throw new STError({
            message: "Missing required parameter 'recipeUserId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let emailVerificationRecipe = undefined;
    try {
        emailVerificationRecipe = stInstance.getRecipeInstanceOrThrow("emailverification");
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    let email: string | undefined = undefined;
    const emailInfo = await emailVerificationRecipe.getEmailForRecipeUserId(
        undefined,
        new RecipeUserId(recipeUserId),
        userContext
    );
    if (emailInfo.status === "OK") {
        email = emailInfo.email;
    } else {
        throw new STError({
            message: "Failed to get email for recipe user id",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
        recipeUserId: new RecipeUserId(recipeUserId),
        email,
        userContext,
    });
    return {
        status: "OK",
        isVerified: response,
    };
};
