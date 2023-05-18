import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import EmailVerificationRecipe from "../../../emailverification/recipe";
import { getEmailVerifyLink } from "../../../emailverification/utils";
import { getUser } from "../../../..";
import RecipeUserId from "../../../../recipeUserId";

type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};

export const userEmailVerifyTokenPost = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;

    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new STError({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let emailResponse = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForRecipeUserId(
        new RecipeUserId(recipeUserId),
        {}
    );

    if (emailResponse.status !== "OK") {
        throw new Error("Should never come here");
    }

    let emailVerificationToken = await EmailVerification.createEmailVerificationToken(new RecipeUserId(recipeUserId));

    if (emailVerificationToken.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
        return {
            status: "EMAIL_ALREADY_VERIFIED_ERROR",
        };
    }

    let emailVerifyLink = getEmailVerifyLink({
        appInfo: options.appInfo,
        token: emailVerificationToken.token,
        recipeId: EmailVerificationRecipe.RECIPE_ID,
    });

    let primaryUser = await getUser(recipeUserId);

    if (primaryUser === undefined) {
        throw new Error("Should never come here");
    }

    await EmailVerification.sendEmail({
        type: "EMAIL_VERIFICATION",
        user: {
            id: primaryUser.id,
            recipeUserId: new RecipeUserId(recipeUserId),
            email: emailResponse.email,
        },
        emailVerifyLink,
    });

    return {
        status: "OK",
    };
};
