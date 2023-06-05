import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { User } from "../../types";
import AccountLinking from "../accountlinking/recipe";
import { getUser } from "../..";

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

            if (response.createdNewUser) {
                let userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                    // we can use index 0 cause this is a new recipe user
                    recipeUserId: response.user.loginMethods[0].recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    isVerified,
                    userContext,
                });

                let updatedUser = await getUser(userId, userContext);

                if (updatedUser === undefined) {
                    throw new Error("Should never come here.");
                }
            }
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
            };
        },
    };
}
