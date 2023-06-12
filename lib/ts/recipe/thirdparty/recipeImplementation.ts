import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { User } from "../../types";
import AccountLinking from "../accountlinking/recipe";
import { getUser } from "../..";
import { mockCreateNewOrUpdateEmailOfRecipeUser } from "./mockCore";
import EmailVerification from "../emailverification";
import RecipeUserId from "../../recipeUserId";

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
    return {
        createNewOrUpdateEmailOfRecipeUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            userContext,
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
        > {
            let users = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                accountInfo: {
                    thirdParty: {
                        id: thirdPartyId,
                        userId: thirdPartyUserId,
                    },
                },
                doUnionOfAccountInfo: false,
                userContext,
            });

            // we can do this check cause we are checking based on third party info which is always
            // unique.
            if (users.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }

            if (users.length === 1) {
                // this means it's a sign in
                let recipeUserId: RecipeUserId | undefined = undefined;
                users[0].loginMethods.forEach((lM) => {
                    if (
                        lM.hasSameThirdPartyInfoAs({
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        })
                    ) {
                        recipeUserId = lM.recipeUserId;
                    }
                });

                if (!isVerified) {
                    // Even if the input isVerified is false, it's from the provider.
                    // Since this is a sign in, the user may have previously verified
                    // their email already with SuperTokens, and so we should set
                    // isVerified to true before proceeding.
                    isVerified = await EmailVerification.isEmailVerified(recipeUserId!, email);
                }

                // During social login, email can be changed by the provider,
                // so we need to check for the new email changed allowance based
                // on the linked accounts.
                let isEmailChangeAllowed = await AccountLinking.getInstance().isEmailChangeAllowed({
                    recipeUserId: recipeUserId!,
                    isVerified,
                    newEmail: email,
                    userContext,
                });

                if (!isEmailChangeAllowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason: "Cannot sign in due to security reasons. Please contact support",
                    };
                }
            }

            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
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
                response = await mockCreateNewOrUpdateEmailOfRecipeUser(thirdPartyId, thirdPartyUserId, email, querier);
            }

            if (response.status === "OK") {
                let recipeUserId: RecipeUserId | undefined = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "thirdparty" &&
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        })
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    recipeUserId: recipeUserId!,
                    userContext,
                });

                // we do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = (await getUser(recipeUserId!.getAsString(), userContext))!;
            }
            return response;
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
                isVerified,
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
                // We do this here and not in createNewOrUpdateEmailOfRecipeUser cause
                // createNewOrUpdateEmailOfRecipeUser is also called in post login account linking.
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
