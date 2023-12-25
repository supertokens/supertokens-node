import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import Passwordless from "../../../../passwordless";
import ThirdPartyPasswordless from "../../../../thirdpartypasswordless";
import PasswordlessRecipe from "../../../../passwordless/recipe";
import ThirdPartyPasswordlessRecipe from "../../../../thirdpartypasswordless/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
import { parsePhoneNumber } from "libphonenumber-js/max";
import { defaultValidateEmail, defaultValidatePhoneNumber } from "../../../../passwordless/utils";

type Response =
    | {
          status: string;
          createdNewRecipeUser: boolean;
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PHONE_VALIDATION_ERROR";
          message: string;
      };

export const createPasswordlessUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    let passwordlessOrThirdpartyPasswordlessRecipe:
        | PasswordlessRecipe
        | ThirdPartyPasswordlessRecipe
        | undefined = undefined;

    try {
        passwordlessOrThirdpartyPasswordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
    } catch (_) {
        try {
            passwordlessOrThirdpartyPasswordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        } catch (_) {
            return {
                status: "FEATURE_NOT_ENABLED_ERROR",
            };
        }
    }

    const requestBody = await options.req.getJSONBody();

    let email: string | undefined = requestBody.email;
    let phoneNumber: string | undefined = requestBody.phoneNumber;

    if ((email !== undefined && phoneNumber !== undefined) || (email === undefined && phoneNumber === undefined)) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide exactly one of email or phoneNumber",
        });
    }

    if (
        email !== undefined &&
        (passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL" ||
            passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        let validationError: string | undefined = undefined;

        if (passwordlessOrThirdpartyPasswordlessRecipe.config.validateEmailAddress !== undefined) {
            validationError = await passwordlessOrThirdpartyPasswordlessRecipe.config.validateEmailAddress(
                email,
                tenantId
            );
        } else {
            validationError = await defaultValidateEmail(email);
        }
        if (validationError !== undefined) {
            return {
                status: "EMAIL_VALIDATION_ERROR",
                message: validationError,
            };
        }
    }

    if (
        phoneNumber !== undefined &&
        (passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        let validationError: string | undefined = undefined;

        if (passwordlessOrThirdpartyPasswordlessRecipe.config.validatePhoneNumber !== undefined) {
            validationError = await passwordlessOrThirdpartyPasswordlessRecipe.config.validatePhoneNumber(
                phoneNumber,
                tenantId
            );
        } else {
            validationError = await defaultValidatePhoneNumber(phoneNumber);
        }

        if (validationError !== undefined) {
            return {
                status: "PHONE_VALIDATION_ERROR",
                message: validationError,
            };
        }

        const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
    }

    if (passwordlessOrThirdpartyPasswordlessRecipe.getRecipeId() === "thirdpartypasswordless") {
        const response = await ThirdPartyPasswordless.passwordlessSignInUp(
            email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber!, tenantId }
        );
        return response;
    } else {
        // not checking explicitly if the recipeId is passwordless or not because at this point of time it should be passowordless.
        const response = await Passwordless.signInUp(
            email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber!, tenantId }
        );
        return response;
    }
};
