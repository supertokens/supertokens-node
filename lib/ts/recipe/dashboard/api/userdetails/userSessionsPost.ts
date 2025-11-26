import { APIFunction } from "../../types";
import STError from "../../../../error";

type Response = {
    status: "OK";
};

export const userSessionsPost = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const sessionHandles = requestBody.sessionHandles;

    if (sessionHandles === undefined || !Array.isArray(sessionHandles)) {
        throw new STError({
            message: "Required parameter 'sessionHandles' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const sessionRecipe = stInstance.getRecipeInstanceOrThrow("session");
    await sessionRecipe.recipeInterfaceImpl.revokeMultipleSessions({ sessionHandles, userContext });
    return {
        status: "OK",
    };
};
