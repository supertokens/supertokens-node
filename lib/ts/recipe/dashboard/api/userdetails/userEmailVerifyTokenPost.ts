import { APIFunction } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import { convertToRecipeUserId } from "../../../..";

type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};

export const userEmailVerifyTokenPost = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;

    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }
    const user = await stInstance
        .getRecipeInstanceOrThrow("accountlinking")
        .recipeInterfaceImpl.getUser({ userId: recipeUserId, userContext });

    if (!user) {
        throw new STError({
            message: "Unknown 'recipeUserId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    return await EmailVerification.sendEmailVerificationEmail(
        tenantId,
        user.id,
        convertToRecipeUserId(recipeUserId),
        undefined,
        userContext
    );
};
