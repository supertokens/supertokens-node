import { APIFunction, APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerificationRecipe from "../../../emailverification/recipe";
import EmailVerification from "../../../emailverification";

type Response =
    | {
          status: "OK";
          isVerified: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

export const userEmailverifyGet: APIFunction = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const req = options.req;
    const userId = req.getKeyValueFromQuery("userId");
    const email = req.getKeyValueFromQuery("email");

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (email === undefined) {
        throw new STError({
            message: "Missing required parameter 'email'",
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

    const response = await EmailVerification.isEmailVerified(userId, email);
    return {
        status: "OK",
        isVerified: response,
    };
};
