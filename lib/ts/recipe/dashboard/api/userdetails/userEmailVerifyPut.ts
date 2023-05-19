import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import RecipeUserId from "../../../../recipeUserId";

type Response = {
    status: "OK";
};

export const userEmailVerifyPut = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    const verified = requestBody.verified;

    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (verified === undefined || typeof verified !== "boolean") {
        throw new STError({
            message: "Required parameter 'verified' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (verified) {
        const tokenResponse = await EmailVerification.createEmailVerificationToken(new RecipeUserId(recipeUserId));

        if (tokenResponse.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "OK",
            };
        }

        const verifyResponse = await EmailVerification.verifyEmailUsingToken(tokenResponse.token);

        if (verifyResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
            // This should never happen because we consume the token immediately after creating it
            throw new Error("Should not come here");
        }
    } else {
        await EmailVerification.unverifyEmail(new RecipeUserId(recipeUserId));
    }

    return {
        status: "OK",
    };
};
