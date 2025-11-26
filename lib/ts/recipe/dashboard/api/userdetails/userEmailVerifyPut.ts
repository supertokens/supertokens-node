import { APIFunction } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import RecipeUserId from "../../../../recipeUserId";

type Response = {
    status: "OK";
};

export const userEmailVerifyPut = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
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
    let emailVerificationRecipe = undefined;
    try {
        emailVerificationRecipe = stInstance.getRecipeInstanceOrThrow("emailverification");
    } catch (e) {
        throw new STError({
            message: "Email verification recipe not initialised",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let email: string | undefined = undefined;
    const emailInfo = await emailVerificationRecipe.getEmailForRecipeUserId(
        undefined,
        new RecipeUserId(recipeUserId),
        userContext
    );
    if (emailInfo.status === "OK") {
        email = emailInfo.email;
    } else {
        throw new STError({
            message: "Failed to get email for recipe user id",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (verified) {
        const tokenResponse = await emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
            recipeUserId: new RecipeUserId(recipeUserId),
            email: email,
            tenantId,
            userContext,
        });

        if (tokenResponse.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "OK",
            };
        }

        const verifyResponse = await EmailVerification.verifyEmailUsingToken(
            tenantId,
            tokenResponse.token,
            undefined,
            userContext
        );

        if (verifyResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
            // This should never happen because we consume the token immediately after creating it
            throw new Error("Should not come here");
        }
    } else {
        await EmailVerification.unverifyEmail(new RecipeUserId(recipeUserId), undefined, userContext);
    }

    return {
        status: "OK",
    };
};
