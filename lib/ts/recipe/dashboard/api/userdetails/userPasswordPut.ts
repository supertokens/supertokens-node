import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import EmailPassword from "../../../emailpassword";
import ThirdPartyEmailPasswordRecipe from "../../../thirdpartyemailpassword/recipe";
import ThirdPartyEmailPassword from "../../../thirdpartyemailpassword";
import { FORM_FIELD_PASSWORD_ID } from "../../../emailpassword/constants";

type Response =
    | {
          status: "OK";
      }
    | {
          status: "PROVIDE_RECIPE_USER_ID_AS_USER_ID_ERROR";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };

export const userPasswordPut = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;
    const email = requestBody.email;
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
        let passwordFormFields = EmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields.filter(
            (field) => field.id === FORM_FIELD_PASSWORD_ID
        );

        let passwordValidationError = await passwordFormFields[0].validate(newPassword);

        if (passwordValidationError !== undefined) {
            return {
                status: "INVALID_PASSWORD_ERROR",
                error: passwordValidationError,
            };
        }

        const passwordResetToken = await EmailPassword.createResetPasswordToken(userId, email);

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

        return {
            status: "OK",
        };
    }

    let passwordFormFields = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields.filter(
        (field) => field.id === FORM_FIELD_PASSWORD_ID
    );

    let passwordValidationError = await passwordFormFields[0].validate(newPassword);

    if (passwordValidationError !== undefined) {
        return {
            status: "INVALID_PASSWORD_ERROR",
            error: passwordValidationError,
        };
    }

    const passwordResetToken = await ThirdPartyEmailPassword.createResetPasswordToken(userId, email);

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

    return {
        status: "OK",
    };
};
