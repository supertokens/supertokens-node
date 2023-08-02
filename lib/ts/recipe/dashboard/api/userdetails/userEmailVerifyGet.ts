import { APIFunction, APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import EmailVerificationRecipe from "../../../emailverification/recipe";
import RecipeUserId from "../../../../recipeUserId";

type Response =
    | {
          status: "OK";
          isVerified: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

export const userEmailVerifyGet: APIFunction = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: any
): Promise<Response> => {
    const req = options.req;
    const recipeUserId = req.getKeyValueFromQuery("recipeUserId");

    if (recipeUserId === undefined) {
        throw new STError({
            message: "Missing required parameter 'recipeUserId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    try {
        EmailVerificationRecipe.getInstanceOrThrowError();
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const response = await EmailVerification.isEmailVerified(new RecipeUserId(recipeUserId), userContext);
    return {
        status: "OK",
        isVerified: response,
    };
};
