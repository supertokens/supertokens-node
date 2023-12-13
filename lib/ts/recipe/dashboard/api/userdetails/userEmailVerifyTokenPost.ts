import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import { convertToRecipeUserId, getUser } from "../../../..";
import { UserContext } from "../../../../types";

type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};

export const userEmailVerifyTokenPost = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;

    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }
    const user = await getUser(recipeUserId, userContext);

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
