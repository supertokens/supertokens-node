import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import EmailPassword from "../../../emailpassword";
import { FORM_FIELD_PASSWORD_ID } from "../../../emailpassword/constants";

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

    let passwordFormFields = EmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields.filter(
        (field) => field.id === FORM_FIELD_PASSWORD_ID
    );

    if (passwordFormFields.length === 0) {
        throw new Error("Should never come here");
    }

    let passwordValidationError = await passwordFormFields[0].validate(newPassword);

    if (passwordValidationError !== undefined) {
        return {
            status: "INVALID_PASSWORD_ERROR",
            error: passwordValidationError,
        };
    }

    const passwordResetToken = await EmailPassword.createResetPasswordToken(userId);

    if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
        // Techincally it can but its an edge case so we assume that it wont
        throw new Error("Should never come here");
    }

    const passwordResetResponse = await EmailPassword.resetPasswordUsingToken(passwordResetToken.token, newPassword);

    if (passwordResetResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        throw new Error("Should never come here");
    }

    return {
        status: "OK",
    };
};
