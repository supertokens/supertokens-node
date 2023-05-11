import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import AccountLinking from "../accountlinking";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        createEmailVerificationToken: async function ({
            recipeUserId,
            email,
        }: {
            recipeUserId: string;
            email: string;
        }): Promise<
            | {
                  status: "OK";
                  token: string;
              }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
        > {
            // userId can be either recipeUserId or primaryUserId
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
                userId: recipeUserId,
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
            userContext,
        }: {
            token: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                method: "token",
                token,
            });
            if (response.status === "OK") {
                await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                    recipeUserId: response.userId,
                    isVerified: true,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });

                return {
                    status: "OK",
                    user: {
                        recipeUserId: response.userId,
                        email: response.email,
                    },
                };
            } else {
                return {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                };
            }
        },

        isEmailVerified: async function ({
            recipeUserId,
            email,
        }: {
            recipeUserId: string;
            email: string;
        }): Promise<boolean> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                userId: recipeUserId,
                email,
            });
            return response.isVerified;
        },

        revokeEmailVerificationTokens: async function (input: {
            recipeUserId: string;
            email: string;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token/remove"), {
                userId: input.recipeUserId,
                email: input.email,
            });
            return { status: "OK" };
        },

        unverifyEmail: async function (input: { recipeUserId: string; email: string }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/remove"), {
                userId: input.recipeUserId,
                email: input.email,
            });
            return { status: "OK" };
        },
    };
}
