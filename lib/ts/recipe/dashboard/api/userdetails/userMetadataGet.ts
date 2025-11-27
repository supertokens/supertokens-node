import { APIFunction } from "../../types";
import STError from "../../../../error";

type Response =
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "OK";
          data: any;
      };

export const userMetaDataGet: APIFunction = async ({
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

    let usermetadataRecipe = undefined;
    try {
        usermetadataRecipe = stInstance.getRecipeInstanceOrThrow("usermetadata");
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const metaDataResponse = usermetadataRecipe.recipeInterfaceImpl.getUserMetadata({ userId, userContext });
    return {
        status: "OK",
        data: (await metaDataResponse).metadata,
    };
};
