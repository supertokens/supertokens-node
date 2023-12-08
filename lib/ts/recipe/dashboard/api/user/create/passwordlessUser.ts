import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import Passwordless from "../../../../passwordless";
import PasswordlessRecipe from "../../../../passwordless/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
import { parsePhoneNumber } from "libphonenumber-js/max";

type Response =
    | {
          status: string;
          createdNewRecipeUser: boolean;
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

export const createPasswordlessUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    let passwordlessRecipe: PasswordlessRecipe | undefined = undefined;

    try {
        passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
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
        const validateError = await passwordlessRecipe.config.validateEmailAddress(email, tenantId);
        if (validateError !== undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: validateError,
            });
        }
        // add email already exists check
    }

    if (
        phoneNumber !== undefined &&
        (passwordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        const validateError = await passwordlessRecipe.config.validatePhoneNumber(phoneNumber, tenantId);
        if (validateError !== undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: validateError,
            });
        }

        const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
        // add phone already exists check
    }

    const response = await Passwordless.signInUp(
        email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber!, tenantId }
    );

    return response;
};
