import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeUserId from "../../recipeUserId";
import { GetEmailForRecipeUserIdFunc } from "./types";

export default function getRecipeInterface(
    querier: Querier,
    getEmailForRecipeUserId: GetEmailForRecipeUserIdFunc
): RecipeInterface {
    return {
        createEmailVerificationToken: async function ({
            recipeUserId,
            email,
            tenantId,
        }: {
            recipeUserId: RecipeUserId;
            email: string;
            tenantId: string;
        }): Promise<
            | {
                  status: "OK";
                  token: string;
              }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
        > {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId}/recipe/user/email/verify/token`),
                {
                    userId: recipeUserId.getAsString(),
                    email,
                }
            );
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
            attemptAccountLinking,
            tenantId,
            userContext,
        }: {
            token: string;
            attemptAccountLinking: boolean;
            tenantId: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId}/recipe/user/email/verify`),
                {
                    method: "token",
                    token,
                }
            );
            if (response.status === "OK") {
                if (attemptAccountLinking) {
                    // before attempting this, we must check that the email that got verified
                    // from the ID is the one that is currently associated with the ID (since
                    // email verification can be done for any combination of (user id, email)
                    // and not necessarily the email that is currently associated with the ID)
                    let emailInfo = await getEmailForRecipeUserId(new RecipeUserId(response.userId), userContext);
                    if (emailInfo.status === "OK" && emailInfo.email === response.email) {
                        // we do this here to prevent cyclic dependencies.
                        // TODO: Fix this.
                        let AccountLinking = require("../accountlinking");
                        await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                            recipeUserId: new RecipeUserId(response.userId),
                            userContext,
                        });
                    }
                }

                return {
                    status: "OK",
                    user: {
                        recipeUserId: new RecipeUserId(response.userId),
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
            recipeUserId: RecipeUserId;
            email: string;
        }): Promise<boolean> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                userId: recipeUserId.getAsString(),
                email,
            });
            return response.isVerified;
        },

        revokeEmailVerificationTokens: async function (input: {
            recipeUserId: RecipeUserId;
            email: string;
            tenantId: string;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/user/email/verify/token/remove`),
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                }
            );
            return { status: "OK" };
        },

        unverifyEmail: async function (input: {
            recipeUserId: RecipeUserId;
            email: string;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/remove"), {
                userId: input.recipeUserId.getAsString(),
                email: input.email,
            });
            return { status: "OK" };
        },
    };
}
