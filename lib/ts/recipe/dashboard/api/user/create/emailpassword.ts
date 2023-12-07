import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import EmailPassword from "../../../../emailpassword";
import EmailPasswordRecipe from "../../../../emailpassword/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";

type Response =
    | {
          status: "OK";
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      };

export const createEmailPasswordUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    try {
        EmailPasswordRecipe.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const requestBody = await options.req.getJSONBody();

    const email = requestBody.email;
    const password = requestBody.password;

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (password === undefined || typeof password !== "string") {
        throw new STError({
            message: "Required parameter 'password' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await EmailPassword.signUp(tenantId, email, password);

    return response;
};
