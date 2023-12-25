import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import EmailPassword from "../../../../emailpassword";
import ThirPartyEmailPassword from "../../../../thirdpartyemailpassword";
import EmailPasswordRecipe from "../../../../emailpassword/recipe";
import ThridPartyEmailPasswordRecipe from "../../../../thirdpartyemailpassword/recipe";
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
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PASSWORD_VALIDATION_ERROR";
          message: string;
      };

export const createEmailPasswordUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> => {
    let emailPasswordOrThirdpartyEmailPassword:
        | EmailPasswordRecipe
        | ThridPartyEmailPasswordRecipe
        | undefined = undefined;
    try {
        emailPasswordOrThirdpartyEmailPassword = EmailPasswordRecipe.getInstanceOrThrowError();
    } catch (error) {
        try {
            emailPasswordOrThirdpartyEmailPassword = ThridPartyEmailPasswordRecipe.getInstanceOrThrowError();
        } catch {
            return {
                status: "FEATURE_NOT_ENABLED_ERROR",
            };
        }
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

    const emailFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "email"
    );

    if (emailFormField !== undefined) {
        const validateEmailError = await emailFormField.validate(email, tenantId, userContext);

        if (validateEmailError !== undefined) {
            return {
                status: "EMAIL_VALIDATION_ERROR",
                message: validateEmailError,
            };
        }
    } else {
        // this should never happen.
        throw new Error("emailFormFiled is undefined");
    }

    const passwordFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "password"
    );

    if (passwordFormField !== undefined) {
        const validatePasswordError = await passwordFormField.validate(password, tenantId, userContext);

        if (validatePasswordError !== undefined) {
            return {
                status: "PASSWORD_VALIDATION_ERROR",
                message: validatePasswordError,
            };
        }
    } else {
        // this should never happen.
        throw new Error("passwordFormField is undefined");
    }

    if (emailPasswordOrThirdpartyEmailPassword.getRecipeId() === "emailpassword") {
        const response = await EmailPassword.signUp(tenantId, email, password);
        return response;
    } else {
        // not checking explicitly if the recipeId is thirdpartyemailpassword or not because at this point of time it should be thirdpartyemailpassword.

        const response = await ThirPartyEmailPassword.emailPasswordSignUp(tenantId, email, password);
        return response;
    }
};
