import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import EmailPassword from "../../../emailpassword";
import ThirdPartyEmailPasswordRecipe from "../../../thirdpartyemailpassword/recipe";
import ThirdPartyEmailPassword from "../../../thirdpartyemailpassword";

type Response =
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };

export const userPasswordPut = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;
    const newPassword = requestBody.newPassword;

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (newPassword === undefined || typeof newPassword !== "string") {
        throw new STError({
            message: "Required parameter 'newPassword' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let recipeToUse: "emailpassword" | "thirdpartyemailpassword" | undefined;

    try {
        EmailPasswordRecipe.getInstanceOrThrowError();
        recipeToUse = "emailpassword";
    } catch (_) {}

    if (recipeToUse === undefined) {
        try {
            ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
            recipeToUse = "thirdpartyemailpassword";
        } catch (_) {}
    }

    if (recipeToUse === undefined) {
        // This means that neither emailpassword or thirdpartyemailpassword is initialised
        throw new Error("Should never come here");
    }

    if (recipeToUse === "emailpassword") {
        const passwordResetToken = await EmailPassword.createResetPasswordToken(userId);

        if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
            // Techincally it can but its an edge case so we assume that it wont
            throw new Error("Should never come here");
        }

        const passwordResetResponse = await EmailPassword.resetPasswordUsingToken(
            passwordResetToken.token,
            newPassword
        );

        if (passwordResetResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
            throw new Error("Should never come here");
        }

        if (passwordResetResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
            return {
                status: "INVALID_PASSWORD_ERROR",
                error: passwordResetResponse.failureReason,
            };
        }

        return {
            status: "OK",
        };
    }

    const passwordResetToken = await ThirdPartyEmailPassword.createResetPasswordToken(userId);

    if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
        // Techincally it can but its an edge case so we assume that it wont
        throw new Error("Should never come here");
    }

    const passwordResetResponse = await ThirdPartyEmailPassword.resetPasswordUsingToken(
        passwordResetToken.token,
        newPassword
    );

    if (passwordResetResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        throw new Error("Should never come here");
    }

    if (passwordResetResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
        return {
            status: "INVALID_PASSWORD_ERROR",
            error: passwordResetResponse.failureReason,
        };
    }

    return {
        status: "OK",
    };
};
