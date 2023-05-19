import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";
import { listUsersByAccountInfo, getUser } from "../../../";
import AccountLinking from "../../accountlinking/recipe";
import EmailVerification from "../../emailverification/recipe";
import { AccountLinkingClaim } from "../../accountlinking/accountLinkingClaim";
import { storeIntoAccountToLinkTable } from "../../accountlinking";
import { RecipeLevelUser } from "../../accountlinking/types";
import RecipeUserId from "../../../recipeUserId";

export default function getAPIImplementation(): APIInterface {
    return {
        linkAccountToExistingAccountPOST: async function ({
            formFields,
            session,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            session: SessionContainerInterface;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  wereAccountsAlreadyLinked: boolean;
              }
            | {
                  status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR" | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                  description: string;
              }
            | {
                  status: "WRONG_CREDENTIALS_ERROR";
              }
            | GeneralErrorResponse
        > {
            const email = formFields.filter((f) => f.id === "email")[0].value;
            const password = formFields.filter((f) => f.id === "password")[0].value;

            const createRecipeUserFunc = async (userContext: any): Promise<void> => {
                await options.recipeImplementation.createNewRecipeUser({
                    email,
                    password,
                    userContext,
                });
                // we ignore the result from the above cause after this, function returns,
                // the linkAccountsWithUserFromSession anyway does recursion..
            };

            const verifyCredentialsFunc = async (
                userContext: any
            ): Promise<
                | { status: "OK" }
                | {
                      status: "CUSTOM_RESPONSE";
                      resp: {
                          status: "WRONG_CREDENTIALS_ERROR";
                      };
                  }
            > => {
                const signInResult = await options.recipeImplementation.signIn({
                    email,
                    password,
                    userContext,
                });

                if (signInResult.status === "OK") {
                    return { status: "OK" };
                } else {
                    return {
                        status: "CUSTOM_RESPONSE",
                        resp: signInResult,
                    };
                }
            };

            let accountLinkingInstance = await AccountLinking.getInstance();
            let result = await accountLinkingInstance.linkAccountsWithUserFromSession<{
                status: "WRONG_CREDENTIALS_ERROR";
            }>({
                session,
                newUser: {
                    email,
                    recipeId: "emailpassword",
                },
                createRecipeUserFunc,
                verifyCredentialsFunc,
                userContext,
            });
            if (result.status === "CUSTOM_RESPONSE") {
                return result.resp;
            } else if (result.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                // this will store in the db that these need to be linked,
                // and after verification, it will link these accounts.
                let toLinkResult = await storeIntoAccountToLinkTable(
                    result.recipeUserId,
                    result.primaryUserId,
                    userContext
                );
                if (toLinkResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    if (toLinkResult.primaryUserId === result.primaryUserId) {
                        // this is some sort of a race condition issue, so we just ignore it
                        // since we already linked to the session's account anyway...
                        return {
                            status: "OK",
                            wereAccountsAlreadyLinked: true,
                        };
                    } else {
                        return {
                            status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                            description:
                                "Input user is already linked to another account. Please try again or contact support.",
                        };
                    }
                }
                // status: "OK"
                await session.setClaimValue(AccountLinkingClaim, result.recipeUserId.getAsString(), userContext);
                return {
                    status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                    description: "Before accounts can be linked, the new account must be verified",
                };
            }
            // status: "OK" | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
            return result;
        },
        emailExistsGET: async function ({
            email,
            userContext,
        }: {
            email: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  exists: boolean;
              }
            | GeneralErrorResponse
        > {
            let usersWithSameEmail = await listUsersByAccountInfo(
                {
                    email,
                },
                userContext
            );

            let exists =
                usersWithSameEmail.find((user) => {
                    return (
                        user.loginMethods.find((lM) => {
                            return lM.recipeId === "emailpassword" && lM.hasSameEmailAs(email);
                        }) !== undefined
                    );
                }) !== undefined;

            return {
                status: "OK",
                exists,
            };
        },
        generatePasswordResetTokenPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | { status: "PASSWORD_RESET_NOT_ALLOWED"; reason: string }
            | GeneralErrorResponse
        > {
            const email = formFields.filter((f) => f.id === "email")[0].value;

            // this function will be reused in different parts of the flow below..
            async function generateAndSendPasswordResetToken(
                userId: string
            ): Promise<
                | {
                      status: "OK";
                  }
                | { status: "PASSWORD_RESET_NOT_ALLOWED"; reason: string }
                | GeneralErrorResponse
            > {
                // the user ID here can be primary or recipe level.
                let response = await options.recipeImplementation.createResetPasswordToken({
                    userId,
                    email,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    logDebugMessage(`Password reset email not sent, unknown user id: ${userId}`);
                    return {
                        status: "OK",
                    };
                }

                let passwordResetLink =
                    options.appInfo.websiteDomain.getAsStringDangerous() +
                    options.appInfo.websiteBasePath.getAsStringDangerous() +
                    "/reset-password?token=" +
                    response.token +
                    "&rid=" +
                    options.recipeId;

                logDebugMessage(`Sending password reset email to ${email}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "PASSWORD_RESET",
                    user: {
                        id: userId,
                        email,
                    },
                    passwordResetLink,
                    userContext,
                });

                return {
                    status: "OK",
                };
            }

            /**
             * check if primaryUserId is linked with this email
             */
            let users = await listUsersByAccountInfo({
                email,
            });

            // we find the recipe user ID of the email password account from the user's list
            // for later use.
            let emailPasswordAccount: RecipeLevelUser | undefined = undefined;
            for (let i = 0; i < users.length; i++) {
                let emailPasswordAccountTmp = users[i].loginMethods.find(
                    (l) => l.recipeId === "emailpassword" && l.hasSameEmailAs(email)
                );
                if (emailPasswordAccountTmp !== undefined) {
                    emailPasswordAccount = emailPasswordAccountTmp;
                    break;
                }
            }

            // we find the primary user ID from the user's list for later use.
            let primaryUserAssociatedWithEmail = users.find((u) => u.isPrimaryUser);

            // first we check if there even exists a primary user that has the input email
            // if not, then we do the regular flow for password reset.
            if (primaryUserAssociatedWithEmail === undefined) {
                if (emailPasswordAccount === undefined) {
                    logDebugMessage(`Password reset email not sent, unknown user email: ${email}`);
                    return {
                        status: "OK",
                    };
                }
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            // Now we need to check that if there exists any email password user at all
            // for the input email. If not, then it implies that when the token is consumed,
            // then we will create a new user - so we should only generate the token if
            // the criteria for the new user is met.
            if (emailPasswordAccount === undefined) {
                // this means that there is no email password user that exists for the input email.
                // So we check for the sign up condition and only go ahead if that condition is
                // met.
                let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    allowLinking: true,
                    userContext,
                });
                if (isSignUpAllowed) {
                    // notice that we pass in the primary user ID here. This means that
                    // we will be creating a new email password account when the token
                    // is consumed and linking it to this primary user.
                    return await generateAndSendPasswordResetToken(primaryUserAssociatedWithEmail.id);
                } else {
                    logDebugMessage(
                        `Password reset email not sent, isSignUpAllowed returned false for email: ${email}`
                    );
                    return {
                        status: "OK",
                    };
                }
            }

            // At this point, we know that some email password user exists with this email
            // and also some primary user ID exist. We now need to find out if they are linked
            // together or not. If they are linked together, then we can just generate the token
            // else we check for more security conditions (since we will be linking them post token generation)

            let areTheTwoAccountsLinked =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.recipeUserId.getAsString() === emailPasswordAccount!.recipeUserId.getAsString();
                }) !== undefined;

            if (areTheTwoAccountsLinked) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            // Here we know that the two accounts are NOT linked. We now need to check for an
            // extra security measure here to make sure that the input email in the primary user
            // is verified, and if not, we need to make sure that there is no other email / phone number
            // associated with the primary user account. If there is, then we do not proceed.

            /*
            This security measure helps prevent the following attack:
            An attacker has email A and they create an account using TP and it doesn't matter if A is verified or not. Now they create another account using EP with email A and verifies it. Both these accounts are linked. Now the attacker changes the email for EP recipe to B which makes the EP account unverified, but it's still linked.

            If the real owner of B tries to signup using EP, it will say that the account already exists so they may try to reset password which should be denied because then they will end up getting access to attacker's account and verify the EP account.

            The problem with this situation is if the EP account is verified, it will allow further sign-ups with email B which will also be linked to this primary account (that the attacker had created with email A).

            It is important to realize that the attacker had created another account with A because if they hadn't done that, then they wouldn't have access to this account after the real user resets the password which is why it is important to check there is another non-EP account linked to the primary such that the email is not the same as B.

            Exception to the above is that, if there is a third recipe account linked to the above two accounts and has B as verified, then we should allow reset password token generation because user has already proven that the owns the email B
            */

            // But first, this only matters it the user cares about checking for email verification status..

            let shouldDoAccountLinkingResponse = await AccountLinking.getInstance().config.shouldDoAutomaticAccountLinking(
                emailPasswordAccount,
                primaryUserAssociatedWithEmail,
                undefined,
                userContext
            );

            if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                // here we will go ahead with the token generation cause
                // even when the token is consumed, we will not be linking the accounts
                // so no need to check for anything
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            if (!shouldDoAccountLinkingResponse.shouldRequireVerification) {
                // the checks below are related to email verification, and if the user
                // does not care about that, then we should just continue with token generation
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            // Now we start the required security checks. First we check if the primary user
            // it has just one linked account. And if that's true, then we continue
            // cause then there is no scope for account takeover
            if (primaryUserAssociatedWithEmail.loginMethods.length === 1) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            // Next we check if there is any login method in which the input email is verified.
            // If that is the case, then it's proven that the user owns the email and we can
            // trust linking of the email password account.
            let emailVerified =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.hasSameEmailAs(email) && lm.verified;
                }) !== undefined;

            if (emailVerified) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }

            // finally, we check if the primary user has any other email / phone number
            // associated with this account - and if it does, then it means that
            // there is a risk of account takeover, so we do not allow the token to be generated
            let hasOtherEmailOrPhone =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    // we do the extra undefined check below cause
                    // hasSameEmailAs returns false if the lm.email is undefined, and
                    // we want to check that the email is different as opposed to email
                    // not existing in lm.
                    return (lm.email !== undefined && !lm.hasSameEmailAs(email)) || lm.phoneNumber !== undefined;
                }) !== undefined;
            if (hasOtherEmailOrPhone) {
                return {
                    status: "PASSWORD_RESET_NOT_ALLOWED",
                    reason: "Token generation was not done because of account take over risk. Please contact support.",
                };
            } else {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId.getAsString());
            }
        },
        passwordResetPOST: async function ({
            formFields,
            token,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            token: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  email: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
            | GeneralErrorResponse
        > {
            async function markEmailAsVerified(recipeUserId: RecipeUserId, email: string) {
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            recipeUserId,
                            email,
                            userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            token: tokenResponse.token,
                            userContext,
                        });
                    }
                }
            }

            async function doUpdatePassword(
                recipeUserId: RecipeUserId
            ): Promise<
                | {
                      status: "OK";
                      user: User;
                      email: string;
                  }
                | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
                | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
                | GeneralErrorResponse
            > {
                let updateResponse = await options.recipeImplementation.updateEmailOrPassword({
                    // we can treat userIdForWhomTokenWasGenerated as a recipe user id cause
                    // whenever this function is called,
                    recipeUserId,
                    password: newPassword,
                    userContext,
                });
                if (
                    updateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
                    updateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR"
                ) {
                    throw new Error("This should never come here because we are not updating the email");
                } else if (updateResponse.status === "UNKNOWN_USER_ID_ERROR") {
                    // This should happen only cause of a race condition where the user
                    // might be deleted before token creation and consumption.
                    return {
                        status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                    };
                } else if (updateResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
                    return {
                        status: "PASSWORD_POLICY_VIOLATED_ERROR",
                        failureReason: updateResponse.failureReason,
                    };
                } else {
                    // status: "OK"
                    return {
                        status: "OK",
                        user: existingUser!,
                        email: emailForWhomTokenWasGenerated,
                    };
                }
            }

            let newPassword = formFields.filter((f) => f.id === "password")[0].value;

            let tokenConsumptionResponse = await options.recipeImplementation.consumePasswordResetToken({
                token,
                userContext,
            });

            if (tokenConsumptionResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
                return tokenConsumptionResponse;
            }

            let userIdForWhomTokenWasGenerated = tokenConsumptionResponse.userId;
            let emailForWhomTokenWasGenerated = tokenConsumptionResponse.email;

            let existingUser = await getUser(tokenConsumptionResponse.userId, userContext);

            if (existingUser === undefined) {
                // This should happen only cause of a race condition where the user
                // might be deleted before token creation and consumption.
                // Also note that this being undefined doesn't mean that the email password
                // user does not exist, but it means that there is no reicpe or primary user
                // for whom the token was generated.
                return {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                };
            }

            // We start by checking if the existingUser is a primary user or not. If it is,
            // then we will try and create a new email password user and link it to the primary user (if required)

            if (existingUser.isPrimaryUser) {
                // If this user contains an email password account for whom the token was generated,
                // then we update that user's password.
                let emailPasswordUserIsLinkedToExistingUser =
                    existingUser.loginMethods.find((lm) => {
                        // we check based on user ID and not email because the only time
                        // the primary user ID is used for token generation is if the email password
                        // user did not exist - in which case the value of emailPasswordUserExists will
                        // resolve to false anyway, and that's what we want.
                        return (
                            lm.recipeUserId.getAsString() === userIdForWhomTokenWasGenerated &&
                            lm.recipeId === "emailpassword"
                        );
                    }) !== undefined;

                if (emailPasswordUserIsLinkedToExistingUser) {
                    return doUpdatePassword(new RecipeUserId(userIdForWhomTokenWasGenerated));
                } else {
                    // this means that the existingUser does not have an emailpassword user associated
                    // with it. It could now mean that no emailpassword user exists, or it could mean that
                    // the the ep user exists, but it's not linked to the current account.
                    // If no ep user doesn't exists, we will create one, and link it to the existing account.
                    // If ep user exists, then it means there is some race condition cause
                    // then the token should have been generated for that user instead of the primary user,
                    // and it shouldn't have come into this branch. So we can simply send a password reset
                    // invalid error and the user can try again.

                    // NOTE: We do not ask the dev if we should do account linking or not here
                    // cause we already have asked them this when generating an password reset token.

                    let createUserResponse = await options.recipeImplementation.createNewRecipeUser({
                        email: tokenConsumptionResponse.email,
                        password: newPassword,
                        userContext,
                    });
                    if (createUserResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                        // this means that the user already existed and we can just return an invalid
                        // token (see the above comment)
                        return {
                            status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                        };
                    } else {
                        // we mark the email as verified because password reset also requires
                        // access to the email to work.. This has a good side effect that
                        // any other login method with the same email in existingAccount will also get marked
                        // as verified.
                        await markEmailAsVerified(
                            createUserResponse.user.loginMethods[0].recipeUserId,
                            tokenConsumptionResponse.email
                        );

                        // Now we try and link the accounts. The function below will try and also
                        // create a primary user of the new account, and if it does that, it's OK..
                        // But in most cases, it will end up linking to existing account since the
                        // email is shared.
                        let linkedToUserId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                            recipeUserId: createUserResponse.user.loginMethods[0].recipeUserId,
                            isVerified: true,
                            checkAccountsToLinkTableAsWell: true,
                            userContext,
                        });
                        if (linkedToUserId !== existingUser.id) {
                            // this means that the account we just linked to
                            // was not the one we had expected to link it to. This can happen
                            // due to some race condition or the other.. Either way, this
                            // is not an issue and we can just return OK
                        }
                        return {
                            status: "OK",
                            email: tokenConsumptionResponse.email,
                            user: (await getUser(linkedToUserId, userContext))!, // we refetch cause we want to return the user object with the updated login methods.
                        };
                    }
                }
            } else {
                // This means that the existing user is not a primary account, which implies that
                // it must be a non linked email password account. In this case, we simply update the password.
                // Linking to an existing account will be done after the user goes through the email
                // verification flow once they log in (if applicable).
                return doUpdatePassword(new RecipeUserId(userIdForWhomTokenWasGenerated));
            }
        },
        signInPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "WRONG_CREDENTIALS_ERROR";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signIn({ email, password, userContext });
            if (response.status === "WRONG_CREDENTIALS_ERROR") {
                return response;
            }

            let emailPasswordRecipeUser = response.user.loginMethods.find(
                (u) => u.recipeId === "emailpassword" && u.hasSameEmailAs(email)
            );

            if (emailPasswordRecipeUser === undefined) {
                // this can happen cause of some race condition, but it's not a big deal.
                throw new Error("Race condition error - please call this API again");
            }

            let session = await Session.createNewSession(
                options.req,
                options.res,
                emailPasswordRecipeUser.recipeUserId,
                {},
                {},
                userContext
            );
            return {
                status: "OK",
                session,
                user: response.user,
            };
        },
        signUpPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            // this function also does account linking
            let response = await options.recipeImplementation.signUp({
                email,
                password,
                userContext,
            });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let emailPasswordRecipeUser = response.user.loginMethods.find(
                (u) => u.recipeId === "emailpassword" && u.hasSameEmailAs(email)
            );

            if (emailPasswordRecipeUser === undefined) {
                // this can happen cause of some race condition, but it's not a big deal.
                throw new Error("Race condition error - please call this API again");
            }

            let session = await Session.createNewSession(
                options.req,
                options.res,
                emailPasswordRecipeUser.recipeUserId,
                {},
                {},
                userContext
            );
            return {
                status: "OK",
                session,
                user: response.user,
            };
        },
    };
}
