import { APIFunction, APIInterface, APIOptions, RecipeLevelUserWithFirstAndLastName } from "../../types";
import STError from "../../../../error";
import { getUserForRecipeId, isRecipeInitialised, isValidRecipeId } from "../../utils";
import UserMetaDataRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";
import RecipeUserId from "../../../../recipeUserId";

type Response =
    | {
          status: "NO_USER_FOUND_ERROR";
      }
    | {
          status: "RECIPE_NOT_INITIALISED"; // TODO: this goes away
      }
    | {
          status: "OK";
          recipeId: "emailpassword" | "thirdparty" | "passwordless";
          user: RecipeLevelUserWithFirstAndLastName; // TODO: this needs to return the primary user id
      };

export const userGet: APIFunction = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: any
): Promise<Response> => {
    const recipeUserId = options.req.getKeyValueFromQuery("recipeUserId"); // TODO: this needs to change to just be user ID
    const recipeId = options.req.getKeyValueFromQuery("recipeId"); // TODO: remove recipeId

    if (recipeUserId === undefined) {
        throw new STError({
            message: "Missing required parameter 'recipeUserId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (recipeId === undefined) {
        throw new STError({
            message: "Missing required parameter 'recipeId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (!isValidRecipeId(recipeId)) {
        throw new STError({
            message: "Invalid recipe id",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (!isRecipeInitialised(recipeId)) {
        return {
            status: "RECIPE_NOT_INITIALISED",
        };
    }

    let user: RecipeLevelUserWithFirstAndLastName | undefined = (
        await getUserForRecipeId(new RecipeUserId(recipeUserId), recipeId)
    ).user;

    if (user === undefined) {
        return {
            status: "NO_USER_FOUND_ERROR",
        };
    }

    try {
        UserMetaDataRecipe.getInstanceOrThrowError();
    } catch (_) {
        user = {
            ...user,
            firstName: "FEATURE_NOT_ENABLED",
            lastName: "FEATURE_NOT_ENABLED",
        };

        return {
            status: "OK",
            recipeId: recipeId as any,
            user,
        };
    }

    const userMetaData = await UserMetaData.getUserMetadata(recipeUserId, userContext);
    const { first_name, last_name } = userMetaData.metadata;

    user = {
        ...user,
        firstName: first_name === undefined ? "" : first_name,
        lastName: last_name === undefined ? "" : last_name,
    };

    return {
        status: "OK",
        recipeId: recipeId as any,
        user,
    };
};
