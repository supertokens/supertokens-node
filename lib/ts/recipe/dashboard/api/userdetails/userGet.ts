import {
    APIFunction,
    APIInterface,
    APIOptions,
    EmailPasswordUser,
    PasswordlessUser,
    ThirdPartyUser,
} from "../../types";
import STError from "../../../../error";
import { getUserForRecipeId, isValidRecipeId } from "../../utils";
import UserMetaDataRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";

type Response =
    | {
          status: "NO_USER_FOUND_ERROR";
      }
    | {
          status: "OK";
          recipeId: "emailpassword";
          user: EmailPasswordUser;
      }
    | {
          status: "OK";
          recipeId: "thirdparty";
          user: ThirdPartyUser;
      }
    | {
          status: "OK";
          recipeId: "passwordless";
          user: PasswordlessUser;
      };

export const userGet: APIFunction = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");
    const recipeId = options.req.getKeyValueFromQuery("recipeId");

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
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

    let user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined = (
        await getUserForRecipeId(userId, recipeId)
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

    const userMetaData = await UserMetaData.getUserMetadata(userId);
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
