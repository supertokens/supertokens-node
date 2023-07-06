import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import EmailVerification from "../../../emailverification";
import EmailVerificationRecipe from "../../../emailverification/recipe";

type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};

export const userEmailVerifyTokenPost = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let emailResponse = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForUserId(userId, userContext);

    if (emailResponse.status !== "OK") {
        throw new Error("Should never come here");
    }

    let emailVerificationLink = await EmailVerification.createEmailVerificationLink(
        userId,
        undefined,
        tenantId,
        userContext
    );

    if (emailVerificationLink.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
        return {
            status: "EMAIL_ALREADY_VERIFIED_ERROR",
        };
    }

    await EmailVerification.sendEmail({
        type: "EMAIL_VERIFICATION",
        user: {
            id: userId,
            email: emailResponse.email,
        },
        emailVerifyLink: emailVerificationLink.link,
    });

    return {
        status: "OK",
    };
};
