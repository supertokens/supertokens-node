import { APIFunction, UserWithFirstAndLastName } from "../../types";
import STError from "../../../../error";
import { User } from "../../../../types";

type Response =
    | {
          status: "NO_USER_FOUND_ERROR";
      }
    | {
          status: "OK";
          user: UserWithFirstAndLastName;
      };

export const userGet: APIFunction = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined || userId === "") {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let user: User | undefined = await stInstance
        .getRecipeInstanceOrThrow("accountlinking")
        .recipeInterfaceImpl.getUser({ userId, userContext });

    if (user === undefined) {
        return {
            status: "NO_USER_FOUND_ERROR",
        };
    }

    let usermetadataRecipe = stInstance.getRecipeInstance("usermetadata");
    if (usermetadataRecipe === undefined) {
        return {
            status: "OK",
            user: {
                ...user.toJson(),
                firstName: "FEATURE_NOT_ENABLED",
                lastName: "FEATURE_NOT_ENABLED",
            },
        };
    }

    const userMetaData = await usermetadataRecipe.recipeInterfaceImpl.getUserMetadata({ userId, userContext });
    const { first_name, last_name } = userMetaData.metadata;

    return {
        status: "OK",
        user: {
            ...user.toJson(),
            firstName: first_name === undefined ? "" : first_name,
            lastName: last_name === undefined ? "" : last_name,
        },
    };
};
