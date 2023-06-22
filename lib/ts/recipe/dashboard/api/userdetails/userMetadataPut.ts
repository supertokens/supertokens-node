import { APIInterface, APIOptions } from "../../types";
import UserMetadaRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";
import STError from "../../../../error";

type Response = {
    status: "OK";
};

export const userMetadataPut = async (_: APIInterface, options: APIOptions, userContext: any): Promise<Response> => {
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
        let parsedData = JSON.parse(data);

        if (typeof parsedData !== "object") {
            throw new Error();
        }

        if (Array.isArray(parsedData)) {
            throw new Error();
        }

        if (parsedData === null) {
            throw new Error();
        }
    } catch (e) {
        throw new STError({
            message: "'data' must be a valid JSON body",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    /**
     * This API is meant to set the user metadata of a user. We delete the existing data
     * before updating it because we want to make sure that shallow merging does not result
     * in the data being incorrect
     *
     * For example if the old data is {test: "test", test2: "test2"} and the user wants to delete
     * test2 from the data simply calling updateUserMetadata with {test: "test"} would not remove
     * test2 because of shallow merging.
     *
     * Removing first ensures that the final data is exactly what the user wanted it to be
     */
    await UserMetaData.clearUserMetadata(userId, userContext);
    await UserMetaData.updateUserMetadata(userId, JSON.parse(data), userContext);

    return {
        status: "OK",
    };
};
