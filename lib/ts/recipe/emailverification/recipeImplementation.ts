import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import RecipeUserId from "../../recipeUserId";
import { GetEmailForRecipeUserIdFunc, UserEmailInfo } from "./types";
import { getUser } from "../..";
import { UserContext } from "../../types";
import type AccountLinkingRecipe from "../accountlinking/recipe";

export default function getRecipeInterface(
    querier: Querier,
    getEmailForRecipeUserId: GetEmailForRecipeUserIdFunc
): RecipeInterface {
    return {
        createEmailVerificationToken: async function ({
            recipeUserId,
            email,
            tenantId,
            userContext,
        }: {
            recipeUserId: RecipeUserId;
            email: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  token: string;
              }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
        > {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify/token",
                    params: {
                        tenantId,
                    },
                },
                {
                    userId: recipeUserId.getAsString(),
                    email,
                },
                userContext
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
        }): Promise<{ status: "OK"; user: UserEmailInfo } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify",
                    params: {
                        tenantId,
                    },
                },
                {
                    method: "token",
                    token,
                },
                userContext
            );
            if (response.status === "OK") {
                const recipeUserId = new RecipeUserId(response.userId);
                if (attemptAccountLinking) {
                    // TODO: this should ideally come from the api response
                    const updatedUser = await getUser(recipeUserId.getAsString());

                    if (updatedUser) {
                        // before attempting this, we must check that the email that got verified
                        // from the ID is the one that is currently associated with the ID (since
                        // email verification can be done for any combination of (user id, email)
                        // and not necessarily the email that is currently associated with the ID)
                        let emailInfo = await getEmailForRecipeUserId(updatedUser, recipeUserId, userContext);
                        if (emailInfo.status === "OK" && emailInfo.email === response.email) {
                            // we do this here to prevent cyclic dependencies.
                            // TODO: Fix this.
                            let AccountLinking =
                                require("../accountlinking/recipe").default.getInstanceOrThrowError() as AccountLinkingRecipe;
                            await AccountLinking.tryLinkingByAccountInfoOrCreatePrimaryUser({
                                tenantId,
                                inputUser: updatedUser,
                                session: undefined,
                                userContext,
                            });
                        }
                    }
                }

                return {
                    status: "OK",
                    user: {
                        recipeUserId,
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
            userContext,
        }: {
            recipeUserId: RecipeUserId;
            email: string;
            userContext: UserContext;
        }): Promise<boolean> {
            let response = await querier.sendGetRequest(
                "/recipe/user/email/verify",
                {
                    userId: recipeUserId.getAsString(),
                    email,
                },
                userContext
            );
            return response.isVerified;
        },

        revokeEmailVerificationTokens: async function (input: {
            recipeUserId: RecipeUserId;
            email: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify/token/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                },
                input.userContext
            );
            return { status: "OK" };
        },

        unverifyEmail: async function (input: {
            recipeUserId: RecipeUserId;
            email: string;
            userContext: UserContext;
        }): Promise<{ status: "OK" }> {
            await querier.sendPostRequest(
                "/recipe/user/email/verify/remove",
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                },
                input.userContext
            );
            return { status: "OK" };
        },
    };
}
