import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import ThirdParty from "../../../../thirdparty";
import ThirdPartyRecipe from "../../../../thirdparty/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";

type Response =
    | {
          status: "OK";
          createdNewRecipeUser: boolean;
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
    | {
          status: "SIGN_IN_UP_NOT_ALLOWED";
          reason: string;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

export const createThridPartyUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    try {
        ThirdPartyRecipe.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const requestBody = await options.req.getJSONBody();

    const thirdPartyId = requestBody.thirdPartyId;
    const thirdPartyUserId = requestBody.thirdPartyUserId;
    const email = requestBody.email;
    const isVerified = requestBody.isVerified;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            message: "Required parameter 'thirdPartyId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (thirdPartyUserId === undefined || typeof thirdPartyUserId !== "string") {
        throw new STError({
            message: "Required parameter 'thirdPartyUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (isVerified === undefined || typeof isVerified !== "boolean") {
        throw new STError({
            message: "Required parameter 'isVerified' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await ThirdParty.manuallyCreateOrUpdateUser(
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified
    );

    return response;
};
