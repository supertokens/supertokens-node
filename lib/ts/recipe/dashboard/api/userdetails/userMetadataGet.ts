import { APIFunction, APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import UserMetaDataRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";
import { UserContext } from "../../../../types";

type Response =
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "OK";
          data: any;
      };

export const userMetaDataGet: APIFunction = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined || userId === "") {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    try {
        UserMetaDataRecipe.getInstanceOrThrowError();
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const metaDataResponse = UserMetaData.getUserMetadata(userId, userContext);
    return {
        status: "OK",
        data: (await metaDataResponse).metadata,
    };
};
