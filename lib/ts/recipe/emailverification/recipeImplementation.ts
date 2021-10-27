import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        createEmailVerificationToken: async function ({
            userId,
            email,
        }: {
            userId: string;
            email: string;
        }): Promise<
            | {
                  status: "OK";
                  token: string;
              }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
        > {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
                userId,
                email,
            });
            if (response.status === "OK") {
                return {
                    status: "OK",
                    token: response.token,
                };
            } else {
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            }
        },

        verifyEmailUsingToken: async function ({
            token,
        }: {
            token: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                method: "token",
                token,
            });
            if (response.status === "OK") {
                return {
                    status: "OK",
                    user: {
                        id: response.userId,
                        email: response.email,
                    },
                };
            } else {
                return {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                };
            }
        },

        isEmailVerified: async function ({ userId, email }: { userId: string; email: string }): Promise<boolean> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                userId,
                email,
            });
            return response.isVerified;
        },

        revokeEmailVerificationTokens: async function (input: {
            userId: string;
            email: string;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token/remove"), {
                userId: input.userId,
                email: input.email,
            });
            return { status: "OK" };
        },

        unverifyEmail: async function (input: { userId: string; email: string }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/remove"), {
                userId: input.userId,
                email: input.email,
            });
            return { status: "OK" };
        },
    };
}
