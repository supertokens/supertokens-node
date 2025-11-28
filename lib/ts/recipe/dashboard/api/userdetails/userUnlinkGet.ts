import { APIFunction } from "../../types";
import STError from "../../../../error";
import RecipeUserId from "../../../../recipeUserId";

type Response = {
    status: "OK";
};

export const userUnlink = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const recipeUserId = options.req.getKeyValueFromQuery("recipeUserId");

    if (recipeUserId === undefined) {
        throw new STError({
            message: "Required field recipeUserId is missing",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    await stInstance
        .getRecipeInstanceOrThrow("accountlinking")
        .recipeInterfaceImpl.unlinkAccount({ recipeUserId: new RecipeUserId(recipeUserId), userContext });

    return {
        status: "OK",
    };
};
