import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { User } from "../../types";
import AccountLinking from "../accountlinking/recipe";
import { getUser } from "../..";
import EmailVerification from "../emailverification/recipe";
import { mockCreateNewOrUpdateEmailOfRecipeUser } from "./mockCore";

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
    return {
        createNewOrUpdateEmailOfRecipeUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
        > {
            if (process.env.MOCK !== "true") {
                let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
                    thirdPartyId,
                    thirdPartyUserId,
                    email: { id: email },
                });

                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                };
            } else {
                return mockCreateNewOrUpdateEmailOfRecipeUser(thirdPartyId, thirdPartyUserId, email, querier);
            }
        },
        signInUp: async function (
            this: RecipeInterface,
            {
                thirdPartyId,
                thirdPartyUserId,
                email,
                isVerified,
                userContext,
            }: {
                thirdPartyId: string;
                thirdPartyUserId: string;
                email: string;
                isVerified: boolean;
                userContext: any;
            }
        ): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "SIGN_IN_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let response = await this.createNewOrUpdateEmailOfRecipeUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                userContext,
            });

            if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                return {
                    status: "SIGN_IN_NOT_ALLOWED",
                    reason: response.reason,
                };
            }

            let userId = response.user.id;

            if (response.createdNewUser) {
                if (isVerified) {
                    const emailVerificationInstance = EmailVerification.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                recipeUserId: response.user.loginMethods[0].recipeUserId,
                                email,
                                userContext,
                            }
                        );

                        if (tokenResponse.status === "OK") {
                            await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                token: tokenResponse.token,
                                attemptAccountLinking: false, // cause we will attempt it right below anyway..
                                userContext,
                            });
                        }
                    }
                }

                userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                    // we can use index 0 cause this is a new recipe user
                    recipeUserId: response.user.loginMethods[0].recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });
            }

            let updatedUser = await getUser(userId, userContext);

            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: updatedUser,
            };
        },
    };
}
