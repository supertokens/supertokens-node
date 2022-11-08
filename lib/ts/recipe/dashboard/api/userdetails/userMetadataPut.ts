import { APIInterface, APIOptions } from "../../types";
import UserMetadaRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";
import STError from "../../../../error";

type Response = {
    status: "OK";
};

export const userMetadataPut = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;
    const data = requestBody.data;

    // This is to throw an error early in case the recipe has not been initialised
    UserMetadaRecipe.getInstanceOrThrowError();

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (data === undefined || typeof data !== "string") {
        throw new STError({
            message: "Required parameter 'data' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    // Make sure that data is a valid JSON, this will throw
    try {
        JSON.parse(data);
    } catch (e) {
        throw new STError({
            message: "'data' must be a valid JSON body",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    await UserMetaData.clearUserMetadata(userId);
    await UserMetaData.updateUserMetadata(userId, JSON.parse(data));

    return {
        status: "OK",
    };
};
