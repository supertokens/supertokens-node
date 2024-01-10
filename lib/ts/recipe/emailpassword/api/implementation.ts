import { APIInterface, APIOptions } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse, User, UserContext } from "../../../types";
import { listUsersByAccountInfo, getUser } from "../../../";
import AccountLinking from "../../accountlinking/recipe";
import EmailVerification from "../../emailverification/recipe";
import { RecipeLevelUser } from "../../accountlinking/types";
import RecipeUserId from "../../../recipeUserId";
import { getPasswordResetLink } from "../utils";
import SessionError from "../../session/error";
import MultiFactorAuth from "../../multifactorauth";
import MultiFactorAuthRecipe from "../../multifactorauth/recipe";
import SessionRecipe from "../../session/recipe";
import { isValidFirstFactor } from "../../multifactorauth/utils";

export default function getAPIImplementation(): APIInterface {
    return {
        emailExistsGET: async function ({
            email,
            tenantId,
        }: {
            email: string;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  exists: boolean;
              }
            | GeneralErrorResponse
        > {
            // even if the above returns true, we still need to check if there
            // exists an email password user with the same email cause the function
            // above does not check for that.
            let users = await listUsersByAccountInfo(
                tenantId,
                {
                    email,
                },
                false
            );
            let emailPasswordUserExists =
                users.find((u) => {
                    return (
                        u.loginMethods.find((lm) => lm.recipeId === "emailpassword" && lm.hasSameEmailAs(email)) !==
                        undefined
                    );
                }) !== undefined;

            return {
                status: "OK",
                exists: emailPasswordUserExists,
            };
        },
        generatePasswordResetTokenPOST: async function ({
            formFields,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
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
                primaryUserId: string,
                recipeUserId: RecipeUserId | undefined
            ): Promise<
                | {
                      status: "OK";
                  }
                | { status: "PASSWORD_RESET_NOT_ALLOWED"; reason: string }
                | GeneralErrorResponse
            > {
                // the user ID here can be primary or recipe level.
                let response = await options.recipeImplementation.createResetPasswordToken({
                    tenantId,
                    userId: recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString(),
                    email,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    logDebugMessage(
                        `Password reset email not sent, unknown user id: ${
                            recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString()
                        }`
                    );
                    return {
                        status: "OK",
                    };
                }

                let passwordResetLink = getPasswordResetLink({
                    appInfo: options.appInfo,
                    token: response.token,
                    recipeId: options.recipeId,
                    tenantId,
                    request: options.req,
                    userContext,
                });

                logDebugMessage(`Sending password reset email to ${email}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    tenantId,
                    type: "PASSWORD_RESET",
                    user: {
                        id: primaryUserId,
                        recipeUserId,
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
            let users = await listUsersByAccountInfo(
                tenantId,
                {
                    email,
                },
                false
            );

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
                return await generateAndSendPasswordResetToken(
                    emailPasswordAccount.recipeUserId.getAsString(),
                    emailPasswordAccount.recipeUserId
                );
            }

            let shouldDoAccountLinkingResponse = await AccountLinking.getInstance().config.shouldDoAutomaticAccountLinking(
                emailPasswordAccount !== undefined
                    ? emailPasswordAccount
                    : {
                          recipeId: "emailpassword",
                          email,
                      },
                primaryUserAssociatedWithEmail,
                tenantId,
                userContext
            );

            // Now we need to check that if there exists any email password user at all
            // for the input email. If not, then it implies that when the token is consumed,
            // then we will create a new user - so we should only generate the token if
            // the criteria for the new user is met.
            if (emailPasswordAccount === undefined) {
                // this means that there is no email password user that exists for the input email.
                // So we check for the sign up condition and only go ahead if that condition is
                // met.

                // But first we must check if account linking is enabled at all - cause if it's
                // not, then the new email password user that will be created in password reset
                // code consume cannot be linked to the primary user - therefore, we should
                // not generate a password reset token
                if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                    logDebugMessage(
                        `Password reset email not sent, since email password user didn't exist, and account linking not enabled`
                    );
                    return {
                        status: "OK",
                    };
                }

                let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    isVerified: true, // cause when the token is consumed, we will mark the email as verified
                    tenantId,
                    userContext,
                });
                if (isSignUpAllowed) {
                    // notice that we pass in the primary user ID here. This means that
                    // we will be creating a new email password account when the token
                    // is consumed and linking it to this primary user.
                    return await generateAndSendPasswordResetToken(primaryUserAssociatedWithEmail.id, undefined);
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
                return await generateAndSendPasswordResetToken(
                    primaryUserAssociatedWithEmail.id,
                    emailPasswordAccount.recipeUserId
                );
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

            if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                // here we will go ahead with the token generation cause
                // even when the token is consumed, we will not be linking the accounts
                // so no need to check for anything
                return await generateAndSendPasswordResetToken(
                    emailPasswordAccount.recipeUserId.getAsString(),
                    emailPasswordAccount.recipeUserId
                );
            }

            if (!shouldDoAccountLinkingResponse.shouldRequireVerification) {
                // the checks below are related to email verification, and if the user
                // does not care about that, then we should just continue with token generation
                return await generateAndSendPasswordResetToken(
                    primaryUserAssociatedWithEmail.id,
                    emailPasswordAccount.recipeUserId
                );
            }

            // Now we start the required security checks. First we check if the primary user
            // it has just one linked account. And if that's true, then we continue
            // cause then there is no scope for account takeover
            if (primaryUserAssociatedWithEmail.loginMethods.length === 1) {
                return await generateAndSendPasswordResetToken(
                    primaryUserAssociatedWithEmail.id,
                    emailPasswordAccount.recipeUserId
                );
            }

            // Next we check if there is any login method in which the input email is verified.
            // If that is the case, then it's proven that the user owns the email and we can
            // trust linking of the email password account.
            let emailVerified =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.hasSameEmailAs(email) && lm.verified;
                }) !== undefined;

            if (emailVerified) {
                return await generateAndSendPasswordResetToken(
                    primaryUserAssociatedWithEmail.id,
                    emailPasswordAccount.recipeUserId
                );
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
                    reason:
                        "Reset password link was not created because of account take over risk. Please contact support. (ERR_CODE_001)",
                };
            } else {
                return await generateAndSendPasswordResetToken(
                    primaryUserAssociatedWithEmail.id,
                    emailPasswordAccount.recipeUserId
                );
            }
        },
        passwordResetPOST: async function ({
            formFields,
            token,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            token: string;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
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
                            tenantId,
                            recipeUserId,
                            email,
                            userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            tenantId,
                            token: tokenResponse.token,
                            attemptAccountLinking: false, // we pass false here cause
                            // we anyway do account linking in this API after this function is
                            // called.
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
                    tenantIdForPasswordPolicy: tenantId,
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
                tenantId,
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

                        // there is an edge case where if the email password recipe user was created
                        // after the password reset token generation, and it was linked to the
                        // primary user id (userIdForWhomTokenWasGenerated), in this case,
                        // we still don't allow password update, cause the user should try again
                        // and the token should be regenerated for the right recipe user.
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
                    // In the edge case that the dev changes account linking allowance from true to false
                    // when it comes here, only a new recipe user id will be created and not linked
                    // cause createPrimaryUserIdOrLinkAccounts will disallow linking. This doesn't
                    // really cause any security issue.

                    let createUserResponse = await options.recipeImplementation.createNewRecipeUser({
                        tenantId,
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
                        const updatedUser = await getUser(createUserResponse.user.id, userContext);
                        if (updatedUser === undefined) {
                            throw new Error("Should never happen - user deleted after during password reset");
                        }
                        createUserResponse.user = updatedUser;
                        // Now we try and link the accounts. The function below will try and also
                        // create a primary user of the new account, and if it does that, it's OK..
                        // But in most cases, it will end up linking to existing account since the
                        // email is shared.
                        let linkedToUser = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                            tenantId,
                            user: createUserResponse.user,
                            userContext,
                        });
                        if (linkedToUser.id !== existingUser.id) {
                            // this means that the account we just linked to
                            // was not the one we had expected to link it to. This can happen
                            // due to some race condition or the other.. Either way, this
                            // is not an issue and we can just return OK
                        }
                        return {
                            status: "OK",
                            email: tokenConsumptionResponse.email,
                            user: linkedToUser,
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
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "WRONG_CREDENTIALS_ERROR";
              }
            | {
                  status: "SIGN_IN_NOT_ALLOWED";
                  reason: string;
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            try {
                let session = await Session.getSession(
                    options.req,
                    options.res,
                    {
                        sessionRequired: false,
                        overrideGlobalClaimValidators: () => [],
                    },
                    userContext
                );
                const mfaInstance = MultiFactorAuthRecipe.getInstance();

                if (mfaInstance === undefined) {
                    if (session === undefined) {
                        // MFA is disabled
                        // No Active session
                        // Sign In

                        let signInResponse = await options.recipeImplementation.signIn({
                            email,
                            password,
                            tenantId,
                            userContext,
                        });

                        if (signInResponse.status === "WRONG_CREDENTIALS_ERROR") {
                            return signInResponse;
                        }

                        await checkIfSignInIsAllowed(tenantId, signInResponse.user, userContext);

                        signInResponse.user = await attemptAccountLinking(tenantId, signInResponse.user, userContext);

                        session = await Session.createNewSession(
                            options.req,
                            options.res,
                            tenantId,
                            signInResponse.recipeUserId,
                            {},
                            {},
                            userContext
                        );

                        return {
                            status: "OK",
                            session,
                            user: signInResponse.user,
                        };
                    } else {
                        // active session
                        let overwriteSessionDuringSignIn = SessionRecipe.getInstanceOrThrowError().config
                            .overwriteSessionDuringSignIn;
                        // MFA is disabled
                        // Active session
                        // Sign In

                        let signInResponse = await options.recipeImplementation.signIn({
                            email,
                            password,
                            tenantId,
                            userContext,
                        });

                        if (signInResponse.status === "WRONG_CREDENTIALS_ERROR") {
                            return signInResponse;
                        }

                        if (overwriteSessionDuringSignIn) {
                            await checkIfSignInIsAllowed(tenantId, signInResponse.user, userContext);

                            signInResponse.user = await attemptAccountLinking(
                                tenantId,
                                signInResponse.user,
                                userContext
                            );

                            session = await Session.createNewSession(
                                options.req,
                                options.res,
                                tenantId,
                                signInResponse.recipeUserId,
                                {},
                                {},
                                userContext
                            );
                        }

                        return {
                            status: "OK",
                            session,
                            user: signInResponse.user,
                        };
                    }
                } else {
                    // MFA is active
                    if (session === undefined) {
                        // MFA is enabled
                        // No Active session / first factor
                        // Sign In

                        let signInResponse = await options.recipeImplementation.signIn({
                            email,
                            password,
                            tenantId,
                            userContext,
                        });

                        if (signInResponse.status === "WRONG_CREDENTIALS_ERROR") {
                            return signInResponse;
                        }

                        await checkIfSignInIsAllowed(tenantId, signInResponse.user, userContext);

                        await checkIfValidFirstFactor(tenantId, userContext);

                        signInResponse.user = await attemptAccountLinking(tenantId, signInResponse.user, userContext);

                        session = await Session.createNewSession(
                            options.req,
                            options.res,
                            tenantId,
                            signInResponse.recipeUserId,
                            {},
                            {},
                            userContext
                        );

                        await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                            session: session,
                            factorId: "emailpassword",
                            userContext,
                        });

                        return {
                            status: "OK",
                            session,
                            user: signInResponse.user,
                        };
                    } else {
                        // secondary factors
                        let sessionUser = await getUser(session.getUserId(), userContext);
                        if (sessionUser === undefined) {
                            throw new SessionError({
                                type: SessionError.UNAUTHORISED,
                                message: "Session user not found",
                            });
                        }

                        // MFA is enabled
                        // Active session / secondary factor
                        // Sign In / Factor completion

                        let signInResponse = await options.recipeImplementation.signIn({
                            email,
                            password,
                            tenantId,
                            userContext,
                        });

                        if (signInResponse.status === "WRONG_CREDENTIALS_ERROR") {
                            return signInResponse;
                        }

                        if (signInResponse.user.id !== sessionUser.id) {
                            return {
                                status: "SIGN_IN_NOT_ALLOWED",
                                reason:
                                    "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_009)",
                            };
                        }

                        await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                            session: session,
                            factorId: "emailpassword",
                            userContext,
                        });

                        return {
                            status: "OK",
                            session,
                            user: signInResponse.user,
                        };
                    }
                }
            } catch (err) {
                if (err instanceof SignInError) {
                    return err.response;
                } else {
                    throw err;
                }
            }
        },

        signUpPOST: async function ({
            formFields,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "SIGN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            while (true) {
                try {
                    let session = await Session.getSession(
                        options.req,
                        options.res,
                        {
                            sessionRequired: false,
                            overrideGlobalClaimValidators: () => [],
                        },
                        userContext
                    );
                    const mfaInstance = MultiFactorAuthRecipe.getInstance();

                    if (mfaInstance === undefined) {
                        if (session === undefined) {
                            // MFA is disabled
                            // No Active session
                            // Sign Up

                            await checkIfSignUpIsAllowed(tenantId, email, userContext);

                            let signUpResponse = await options.recipeImplementation.signUp({
                                tenantId,
                                email,
                                password,
                                shouldAttemptAccountLinkingIfAllowed: true,
                                userContext,
                            });
                            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                                return signUpResponse;
                            }

                            session = await Session.createNewSession(
                                options.req,
                                options.res,
                                tenantId,
                                signUpResponse.recipeUserId,
                                {},
                                {},
                                userContext
                            );

                            return {
                                status: "OK",
                                session,
                                user: signUpResponse.user,
                            };
                        } else {
                            // active session
                            let overwriteSessionDuringSignIn = SessionRecipe.getInstanceOrThrowError().config
                                .overwriteSessionDuringSignIn;
                            // MFA is disabled
                            // Active session
                            // Sign Up

                            await checkIfSignUpIsAllowed(tenantId, email, userContext);

                            let signUpResponse = await options.recipeImplementation.signUp({
                                tenantId,
                                email,
                                password,
                                shouldAttemptAccountLinkingIfAllowed: true,
                                userContext,
                            });
                            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                                return signUpResponse;
                            }

                            if (overwriteSessionDuringSignIn) {
                                session = await Session.createNewSession(
                                    options.req,
                                    options.res,
                                    tenantId,
                                    signUpResponse.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                            }

                            return {
                                status: "OK",
                                session,
                                user: signUpResponse.user,
                            };
                        }
                    } else {
                        // MFA is active
                        if (session === undefined) {
                            // MFA is enabled
                            // No Active session / first factor
                            // Sign Up

                            await checkIfSignUpIsAllowed(tenantId, email, userContext);
                            let signUpResponse = await options.recipeImplementation.signUp({
                                tenantId,
                                email,
                                password,
                                shouldAttemptAccountLinkingIfAllowed: true,
                                userContext,
                            });
                            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                                return signUpResponse;
                            }

                            session = await Session.createNewSession(
                                options.req,
                                options.res,
                                tenantId,
                                signUpResponse.recipeUserId,
                                {},
                                {},
                                userContext
                            );

                            await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                session: session,
                                factorId: "emailpassword",
                                userContext,
                            });

                            return {
                                status: "OK",
                                session,
                                user: signUpResponse.user,
                            };
                        } else {
                            // secondary factors
                            let sessionUser = await getUser(session.getUserId(), userContext);
                            if (sessionUser === undefined) {
                                throw new SessionError({
                                    type: SessionError.UNAUTHORISED,
                                    message: "Session user not found",
                                });
                            }

                            // MFA is enabled
                            // Active session / secondary factor
                            // Sign Up / Factor setup

                            checkFactorUserAccountInfoForVerification(sessionUser, { email });

                            await MultiFactorAuth.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                session,
                                "emailpassword",
                                userContext
                            );

                            await checkIfFactorUserBeingCreatedCanBeLinkedWithSessionUser(
                                tenantId,
                                sessionUser,
                                { email },
                                userContext
                            );

                            let signUpResponse = await options.recipeImplementation.signUp({
                                tenantId,
                                email,
                                password,
                                shouldAttemptAccountLinkingIfAllowed: false,
                                userContext,
                            });
                            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                                return signUpResponse;
                            }

                            signUpResponse.user = await linkAccountsForFactorSetup(
                                sessionUser,
                                signUpResponse.recipeUserId,
                                userContext
                            );

                            await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                session: session,
                                factorId: "emailpassword",
                                userContext,
                            });

                            return {
                                status: "OK",
                                session,
                                user: signUpResponse.user,
                            };
                        }
                    }
                } catch (err) {
                    if (err instanceof SignUpError) {
                        return err.response;
                    } else if (err instanceof RecurseError) {
                        continue;
                    } else {
                        throw err;
                    }
                }
            }
        },
    };
}

class SignUpError extends Error {
    response:
        | {
              status: "SIGN_UP_NOT_ALLOWED";
              reason: string;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          };

    constructor(
        response:
            | { status: "SIGN_UP_NOT_ALLOWED"; reason: string }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
    ) {
        super(response.status);

        this.response = response;
    }
}

class SignInError extends Error {
    response: {
        status: "SIGN_IN_NOT_ALLOWED";
        reason: string;
    };

    constructor(response: { status: "SIGN_IN_NOT_ALLOWED"; reason: string }) {
        super(response.status);

        this.response = response;
    }
}

class RecurseError extends Error {
    constructor() {
        super("RECURSE");
    }
}

const checkIfSignInIsAllowed = async (tenantId: string, user: User, userContext: UserContext) => {
    let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
        user,
        tenantId,
        userContext,
    });

    if (!isSignInAllowed) {
        throw new SignInError({
            status: "SIGN_IN_NOT_ALLOWED",
            reason:
                "Cannot sign in due to security reasons. Please try resetting your password, use a different login method or contact support. (ERR_CODE_008)",
        });
    }
};

const attemptAccountLinking = async (tenantId: string, user: User, userContext: UserContext) => {
    return await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
        tenantId,
        user,
        userContext,
    });
};

const checkIfValidFirstFactor = async (tenantId: string, userContext: UserContext) => {
    let isValid = isValidFirstFactor(tenantId, "emailpassword", userContext);

    if (!isValid) {
        throw new SessionError({
            type: SessionError.UNAUTHORISED,
            message: "Session is required for secondary factors",
            payload: {
                clearTokens: false,
            },
        });
    }
};

const checkIfSignUpIsAllowed = async (tenantId: string, email: string, userContext: UserContext) => {
    let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
        newUser: {
            recipeId: "emailpassword",
            email,
        },
        isVerified: false,
        tenantId,
        userContext,
    });

    if (!isSignUpAllowed) {
        if (!isSignUpAllowed) {
            const conflictingUsers = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });
            if (
                conflictingUsers.some((u) =>
                    u.loginMethods.some((lm) => lm.recipeId === "emailpassword" && lm.hasSameEmailAs(email))
                )
            ) {
                throw new SignUpError({
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                });
            }

            throw new SignUpError({
                status: "SIGN_UP_NOT_ALLOWED",
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
            });
        }
    }
};

const checkFactorUserAccountInfoForVerification = (sessionUser: User, accountInfo: { email: string }) => {
    /*
        We discussed another method but did not go ahead with it, details below:

        We can allow the second factor to be linked to first factor even if the emails are different 
        and not verified as long as there is no other user that exists (recipe or primary) that has the 
        same email as that of the second factor. For example, if first factor is google login with e1 
        and second factor is email password with e2, we allow linking them as long as there is no other 
        user with email e2.

        We rejected this idea cause if auto account linking is switched off, then someone else can sign up 
        with google using e2. This is OK as it would not link (since account linking is switched off). 
        But, then if account linking is switched on, then the google sign in (and not sign up) with e2 
        would actually cause it to be linked with the e1 account.
    */

    // we allow setup of unverified account info only if the session user has the same account info
    // and it is verified

    if (accountInfo.email !== undefined) {
        let foundVerifiedEmail = false;
        for (const lM of sessionUser?.loginMethods) {
            if (lM.hasSameEmailAs(accountInfo.email) && lM.verified) {
                foundVerifiedEmail = true;
                break;
            }
        }

        if (!foundVerifiedEmail) {
            throw new SignUpError({
                status: "SIGN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_010)",
            });
        }
    }
};

const checkIfFactorUserBeingCreatedCanBeLinkedWithSessionUser = async (
    tenantId: string,
    sessionUser: User,
    accountInfo: { email: string },
    userContext: UserContext
) => {
    if (!sessionUser.isPrimaryUser) {
        const canCreatePrimary = await AccountLinking.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
            recipeUserId: sessionUser.loginMethods[0].recipeUserId,
            userContext,
        });

        if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            // Race condition since we just checked that it was not a primary user
            throw new RecurseError();
        }

        if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new SignUpError({
                status: "SIGN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_011)",
            });
        }
    }

    // Check if the linking with session user going to fail and avoid user creation here
    const users = await listUsersByAccountInfo(tenantId, accountInfo, true, userContext);
    for (const user of users) {
        if (user.isPrimaryUser && user.id !== sessionUser.id) {
            throw new SignUpError({
                status: "SIGN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_012)",
            });
        }
    }
};

const linkAccountsForFactorSetup = async (sessionUser: User, recipeUserId: RecipeUserId, userContext: UserContext) => {
    if (!sessionUser.isPrimaryUser) {
        const createPrimaryRes = await AccountLinking.getInstance().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId: new RecipeUserId(sessionUser.id),
            userContext,
        });
        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            throw new RecurseError();
        } else if (createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new RecurseError();
        }
    }

    const linkRes = await AccountLinking.getInstance().recipeInterfaceImpl.linkAccounts({
        recipeUserId: recipeUserId,
        primaryUserId: sessionUser.id,
        userContext,
    });

    if (linkRes.status !== "OK") {
        throw new RecurseError();
    }

    if (linkRes.status !== "OK") {
        throw new RecurseError();
    }

    let user = await getUser(recipeUserId.getAsString(), userContext);
    if (user === undefined) {
        // linked user not found
        throw new SessionError({
            type: SessionError.UNAUTHORISED,
            message: "User not found",
        });
    }

    return user;
};
