import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeUserId from "../../recipeUserId";
import { GetEmailForRecipeUserIdFunc, UserEmailInfo } from "./types";
import { getUser } from "../..";
import { UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";

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
                new NormalisedURLPath(`/${tenantId}/recipe/user/email/verify/token`),
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
            session,
            tenantId,
            userContext,
        }: {
            token: string;
            attemptAccountLinking: boolean;
            tenantId: string;
            session: SessionContainerInterface;
            userContext: UserContext;
        }): Promise<{ status: "OK"; user: UserEmailInfo } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId}/recipe/user/email/verify`),
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
                            let AuthUtils = require("../../authUtils").AuthUtils;
                            await AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo({
                                tenantId,
                                inputUser: updatedUser,
                                recipeUserId,
                                session,
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
                new NormalisedURLPath("/recipe/user/email/verify"),
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
                new NormalisedURLPath(`/${input.tenantId}/recipe/user/email/verify/token/remove`),
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
                new NormalisedURLPath("/recipe/user/email/verify/remove"),
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
