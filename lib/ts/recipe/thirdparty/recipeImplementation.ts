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

            let isAccountLinkingEnabled = false;
            if (users.length === 1 && !isVerified) {
                // We do this check outside the if statement below cause we may
                // end up changing the value of isVerified

                // Even if the input isVerified is false, it's from the provider.
                // Since this is a sign in, the user may have previously verified
                // their email already with SuperTokens, and so we should set
                // isVerified to true before proceeding.
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
                isVerified = await EmailVerification.isEmailVerified(recipeUserId!, email);
            }
            if (users.length === 1 && !isVerified) {
                // we do all of this cause we need to know if the dev allows for
                // account linking if we were to change the email of this user (since the
                // core API requires this boolean). If the input user is already a primary
                // user, then there will be no account linking done on email change, so we can just pass
                // that has false. If the current user is a recipe user, and there is no primary
                // user that exists for the new email, then also, there will be no account linking
                // done, so we again pass it as false. Therefore the only time we need to check
                // for account linking from the callback is if the current user is a recipe user,
                // and it will be linked to a primary user post email verification change.

                // In addition to the above, we also only do this block if isVerified is false,
                // cause if it's true, then the user has proven that they own the email address
                // and then future linking should not be an issue.
                let user = users[0];
                let existingUsersWithNewEmail = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo(
                    {
                        accountInfo: {
                            email,
                        },
                        doUnionOfAccountInfo: false,
                        userContext,
                    }
                );
                let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
                if (
                    primaryUserForNewEmail.length === 1 &&
                    primaryUserForNewEmail[0].id !== user.id &&
                    !user.isPrimaryUser
                ) {
                    // the above if statement is done cause only then it implies that
                    // post email update, the current user will be linked to the primary user.

                    let shouldDoAccountLinking = await AccountLinking.getInstance().config.shouldDoAutomaticAccountLinking(
                        {
                            recipeId: "thirdparty",
                            email: email,
                            thirdParty: {
                                id: thirdPartyId,
                                userId: thirdPartyUserId,
                            },
                        },
                        primaryUserForNewEmail[0],
                        undefined,
                        userContext
                    );

                    isAccountLinkingEnabled = shouldDoAccountLinking.shouldAutomaticallyLink;
                }
            }

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
                return mockCreateNewOrUpdateEmailOfRecipeUser(
                    thirdPartyId,
                    thirdPartyUserId,
                    email,
                    isAccountLinkingEnabled,
                    isVerified,
                    querier
                );
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
