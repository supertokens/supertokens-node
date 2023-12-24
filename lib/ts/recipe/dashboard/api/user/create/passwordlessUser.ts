import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import Passwordless from "../../../../passwordless";
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
          status: "INPUT_VALIDATION_ERROR";
          message: string;
      };

export const createPasswordlessUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    let passwordlessRecipe: PasswordlessRecipe | ThirdPartyPasswordlessRecipe | undefined = undefined;

    try {
        passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
    } catch (_) {
        try {
            passwordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
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
        (passwordlessRecipe.config.contactMethod === "EMAIL" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        const validateError = await defaultValidateEmail(email);
        if (validateError !== undefined) {
            return {
                status: "INPUT_VALIDATION_ERROR",
                message: validateError,
            };
        }
    }

    if (
        phoneNumber !== undefined &&
        (passwordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        const validateError = await defaultValidatePhoneNumber(phoneNumber);
        if (validateError !== undefined) {
            return {
                status: "INPUT_VALIDATION_ERROR",
                message: validateError,
            };
        }

        const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        phoneNumber = parsedPhoneNumber.format("E.164");
    }

    const response = await Passwordless.signInUp(
        email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber!, tenantId }
    );

    return response;
};
