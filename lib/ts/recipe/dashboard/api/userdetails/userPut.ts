import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import ThirdPartyEmailPasswordRecipe from "../../../emailpassword/recipe";
import PasswordlessRecipe from "../../../passwordless/recipe";
import ThirdPartyPasswordlessRecipe from "../../../thirdpartypasswordless/recipe";
import EmailPassword from "../../../emailpassword";
import Passwordless from "../../../passwordless";
import ThirdPartyEmailPassword from "../../../thirdpartyemailpassword";
import ThirdPartyPasswordless from "../../../thirdpartypasswordless";
import { isValidRecipeId, getUserForRecipeId } from "../../utils";
import UserMetadataRecipe from "../../../usermetadata/recipe";
import UserMetadata from "../../../usermetadata";
import { FORM_FIELD_EMAIL_ID } from "../../../emailpassword/constants";
import { defaultValidateEmail, defaultValidatePhoneNumber } from "../../../passwordless/utils";

type Response =
    | {
          status: "OK";
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_EMAIL_ERROR";
          error: string;
      }
    | {
          status: "PHONE_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_PHONE_ERROR";
          error: string;
      };

const updateEmailForRecipeId = async (
    recipeId: "emailpassword" | "thirdparty" | "passwordless" | "thirdpartyemailpassword" | "thirdpartypasswordless",
    userId: string,
    email: string
): Promise<
    | {
          status: "OK";
      }
    | {
          status: "INVALID_EMAIL_ERROR";
          error: string;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
> => {
    if (recipeId === "emailpassword") {
        let emailFormFields = EmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields.filter(
            (field) => field.id === FORM_FIELD_EMAIL_ID
        );

        let validationError = await emailFormFields[0].validate(email);

        if (validationError !== undefined) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }

        const emailUpdateResponse = await EmailPassword.updateEmailOrPassword({
            userId,
            email,
        });

        if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        }

        return {
            status: "OK",
        };
    }

    if (recipeId === "thirdpartyemailpassword") {
        let emailFormFields = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields.filter(
            (field) => field.id === FORM_FIELD_EMAIL_ID
        );

        let validationError = await emailFormFields[0].validate(email);

        if (validationError !== undefined) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }

        const emailUpdateResponse = await ThirdPartyEmailPassword.updateEmailOrPassword({
            userId,
            email,
        });

        if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        }

        if (emailUpdateResponse.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }

        return {
            status: "OK",
        };
    }

    if (recipeId === "passwordless") {
        let isValidEmail = true;
        let validationError = "";

        const passwordlessConfig = PasswordlessRecipe.getInstanceOrThrowError().config;

        if (passwordlessConfig.contactMethod === "PHONE") {
            const validationResult = await defaultValidateEmail(email);

            if (validationResult !== undefined) {
                isValidEmail = true;
                validationError = validationResult;
            }
        } else {
            const validationResult = await passwordlessConfig.validateEmailAddress(email);

            if (validationResult !== undefined) {
                isValidEmail = true;
                validationError = validationResult;
            }
        }

        if (!isValidEmail) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }

        const updateResult = await Passwordless.updateUser({
            userId,
            email,
        });

        if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }

        if (updateResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        }

        return {
            status: "OK",
        };
    }

    if (recipeId === "thirdpartypasswordless") {
        let isValidEmail = true;
        let validationError = "";

        const passwordlessConfig = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().passwordlessRecipe.config;

        if (passwordlessConfig.contactMethod === "PHONE") {
            const validationResult = await defaultValidateEmail(email);

            if (validationResult !== undefined) {
                isValidEmail = true;
                validationError = validationResult;
            }
        } else {
            const validationResult = await passwordlessConfig.validateEmailAddress(email);

            if (validationResult !== undefined) {
                isValidEmail = true;
                validationError = validationResult;
            }
        }

        if (!isValidEmail) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }

        const updateResult = await ThirdPartyPasswordless.updatePasswordlessUser({
            userId,
            email,
        });

        if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }

        if (updateResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        }

        return {
            status: "OK",
        };
    }

    /**
     * If it comes here then the user is a third party user in which case the UI should not have allowed this
     */
    throw new Error("Should never come here");
};

const updatePhoneForRecipeId = async (
    recipeId: "emailpassword" | "thirdparty" | "passwordless" | "thirdpartyemailpassword" | "thirdpartypasswordless",
    userId: string,
    phone: string
): Promise<
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PHONE_ERROR";
          error: string;
      }
    | {
          status: "PHONE_ALREADY_EXISTS_ERROR";
      }
> => {
    if (recipeId === "passwordless") {
        let isValidPhone = true;
        let validationError = "";

        const passwordlessConfig = PasswordlessRecipe.getInstanceOrThrowError().config;

        if (passwordlessConfig.contactMethod === "EMAIL") {
            const validationResult = await defaultValidatePhoneNumber(phone);

            if (validationResult !== undefined) {
                isValidPhone = true;
                validationError = validationResult;
            }
        } else {
            const validationResult = await passwordlessConfig.validatePhoneNumber(phone);

            if (validationResult !== undefined) {
                isValidPhone = true;
                validationError = validationResult;
            }
        }

        if (!isValidPhone) {
            return {
                status: "INVALID_PHONE_ERROR",
                error: validationError,
            };
        }

        const updateResult = await Passwordless.updateUser({
            userId,
            phoneNumber: phone,
        });

        if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }

        if (updateResult.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR") {
            return {
                status: "PHONE_ALREADY_EXISTS_ERROR",
            };
        }

        return {
            status: "OK",
        };
    }

    if (recipeId === "thirdpartypasswordless") {
        let isValidPhone = true;
        let validationError = "";

        const passwordlessConfig = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().passwordlessRecipe.config;

        if (passwordlessConfig.contactMethod === "EMAIL") {
            const validationResult = await defaultValidatePhoneNumber(phone);

            if (validationResult !== undefined) {
                isValidPhone = true;
                validationError = validationResult;
            }
        } else {
            const validationResult = await passwordlessConfig.validatePhoneNumber(phone);

            if (validationResult !== undefined) {
                isValidPhone = true;
                validationError = validationResult;
            }
        }

        if (!isValidPhone) {
            return {
                status: "INVALID_PHONE_ERROR",
                error: validationError,
            };
        }

        const updateResult = await ThirdPartyPasswordless.updatePasswordlessUser({
            userId,
            phoneNumber: phone,
        });

        if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }

        if (updateResult.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR") {
            return {
                status: "PHONE_ALREADY_EXISTS_ERROR",
            };
        }

        return {
            status: "OK",
        };
    }

    /**
     * If it comes here then the user is a not a passwordless user in which case the UI should not have allowed this
     */
    throw new Error("Should never come here");
};

export const userPut = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;
    const recipeId = requestBody.recipeId;
    const firstName = requestBody.firstName;
    const lastName = requestBody.lastName;
    const email = requestBody.email;
    const phone = requestBody.phone;

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (recipeId === undefined || typeof recipeId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (!isValidRecipeId(recipeId)) {
        throw new STError({
            message: "Invalid recipe id",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (firstName === undefined || typeof firstName !== "string") {
        throw new STError({
            message: "Required parameter 'firstName' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (lastName === undefined || typeof lastName !== "string") {
        throw new STError({
            message: "Required parameter 'lastName' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (phone === undefined || typeof phone !== "string") {
        throw new STError({
            message: "Required parameter 'phone' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let userResponse = await getUserForRecipeId(userId, recipeId);

    if (userResponse.user === undefined || userResponse.recipe === undefined) {
        throw new Error("Should never come here");
    }

    if (firstName.trim() !== "" || lastName.trim() !== "") {
        let isRecipeInitialised = false;
        try {
            UserMetadataRecipe.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {
            // no op
        }

        if (isRecipeInitialised) {
            let metaDataUpdate: any = {};

            if (firstName.trim() !== "") {
                metaDataUpdate["first_name"] = firstName.trim();
            }

            if (lastName.trim() !== "") {
                metaDataUpdate["last_name"] = lastName.trim();
            }

            await UserMetadata.updateUserMetadata(userId, metaDataUpdate);
        }
    }

    if (email.trim() !== "") {
        const emailUpdateResponse = await updateEmailForRecipeId(userResponse.recipe, userId, email.trim());

        if (emailUpdateResponse.status !== "OK") {
            return emailUpdateResponse;
        }
    }

    if (phone.trim() !== "") {
        const phoneUpdateResponse = await updatePhoneForRecipeId(userResponse.recipe, userId, phone.trim());

        if (phoneUpdateResponse.status !== "OK") {
            return phoneUpdateResponse;
        }
    }

    return {
        status: "OK",
    };
};
