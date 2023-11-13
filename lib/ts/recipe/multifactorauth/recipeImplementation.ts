import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import RecipeUserId from "../../recipeUserId";
import { User } from "../../user";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        // markFactorAsCompleteInSession: async ({ session, factor, userContext }) => {
        //     const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
        //     const completed = {
        //         ...currentValue?.c,
        //         [factor]: Math.floor(Date.now() / 1000),
        //     };
        //     const setupUserFactors = await this.recipeInterfaceImpl.getFactorsSetupForUser({
        //         userId: session.getUserId(),
        //         tenantId: session.getTenantId(),
        //         userContext,
        //     });
        //     const requirements = await this.config.getMFARequirementsForAuth(
        //         session,
        //         setupUserFactors,
        //         completed,
        //         userContext
        //     );
        //     const next = MultiFactorAuthClaim.buildNextArray(completed, requirements);
        //     await session.setClaimValue(MultiFactorAuthClaim, {
        //         c: completed,
        //         n: next,
        //     });
        // },

        createPrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: RecipeUserId;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  user: User;
                  wasAlreadyAPrimaryUser: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/user/primary"), {
                recipeUserId: recipeUserId.getAsString(),
            });
            if (response.status === "OK") {
                response.user = new User(response.user);
            }
            return response;
        },

        linkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
            }: {
                recipeUserId: RecipeUserId;
                primaryUserId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
                  user: User;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  user: User;
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
              }
        > {
            const accountsLinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
            );

            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.status
                )
            ) {
                accountsLinkingResult.user = new User(accountsLinkingResult.user);
            }

            // TODO check if the code below is required
            // if (accountsLinkingResult.status === "OK") {
            //     let user: UserType = accountsLinkingResult.user;
            //     if (!accountsLinkingResult.accountsAlreadyLinked) {
            //         await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
            //             user: user,
            //             recipeUserId,
            //             userContext,
            //         });

            //         const updatedUser = await this.getUser({
            //             userId: primaryUserId,
            //             userContext,
            //         });
            //         if (updatedUser === undefined) {
            //             throw Error("this error should never be thrown");
            //         }
            //         user = updatedUser;
            //         let loginMethodInfo = user.loginMethods.find(
            //             (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
            //         );
            //         if (loginMethodInfo === undefined) {
            //             throw Error("this error should never be thrown");
            //         }

            //         // await config.onAccountLinked(user, loginMethodInfo, userContext);
            //     }
            //     accountsLinkingResult.user = user;
            // }

            return accountsLinkingResult;
        },
    } as any;
}
