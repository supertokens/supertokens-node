import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session, { createNewSession } from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";
import { listUsersByAccountInfo, getUser } from "../../../";
import AccountLinking from "../../accountlinking/recipe";
import EmailVerification from "../../emailverification/recipe";
import { AccountLinkingClaim } from "../../accountlinking/accountLinkingClaim";
import { linkAccounts, storeIntoAccountToLinkTable } from "../../accountlinking";
import { RecipeLevelUser } from "../../accountlinking/types";

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

            const createRecipeUserFunc = async (): Promise<void> => {
                await options.recipeImplementation.createNewRecipeUser({
                    email,
                    password,
                    userContext,
                });
                // we ignore the result from the above cause after this, function returns,
                // the linkAccountsWithUserFromSession anyway does recursion..
            };

            const verifyCredentialsFunc = async (): Promise<
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

            let accountLinkingInstance = await AccountLinking.getInstanceOrThrowError();
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
                await session.fetchAndSetClaim(AccountLinkingClaim, userContext);
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
                            return lM.recipeId === "emailpassword" && lM.email === email;
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
                    (l) => l.recipeId === "emailpassword" && l.email === email
                );
                if (emailPasswordAccount !== undefined) {
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
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeUserId);
            }

            // Now we need to check that if there exists any email password user at all
            // for the input email. If not, then it implies that when the token is consumed,
            // then we will create a new user - so we should only generate the token if
            // the criteria for the new user is met.
            if (emailPasswordAccount === undefined) {
                // this means that there is no email password user that exists for the input email.
                // So we check for the sign up condition and only go ahead if that condition is
                // met.
                let isSignUpAllowed = await AccountLinking.getInstanceOrThrowError().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    userContext,
                });
                if (isSignUpAllowed) {
                    // notice that we pass in the primary user ID here. This means that
                    // we will be creating a new email password account with the token
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
                    return lm.recipeUserId === emailPasswordAccount!.recipeUserId;
                }) !== undefined;

            if (areTheTwoAccountsLinked) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
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

            It is important to realise that the attacker had created another account with A because if they hadn't done that, then they wouldn't have access to this account after the real user resets the password which is why it is important to check there is another non-EP account linked to the primary such that the email is not the same as B.

            Exception to the above is that, if there is a third recipe account linked to the above two accounts and has B as verified, then we should allow reset password token generation because user has already proven that the owns the email B
            */

            // But first, this only matters it the user cares about checking for email verification status..

            let shouldDoAccountLinkingResponse = await AccountLinking.getInstanceOrThrowError().config.shouldDoAutomaticAccountLinking(
                emailPasswordAccount,
                primaryUserAssociatedWithEmail,
                undefined,
                userContext
            );

            if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                // here we will go ahead with the token generation cause
                // even when the token is consumed, we will not be linking the accounts
                // so no need to check for anything
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
            }

            if (!shouldDoAccountLinkingResponse.shouldRequireVerification) {
                // the checks below are related to email verification, and if the user
                // does not care about that, then we should just continue with token generation
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
            }

            // Now we start the required security checks. First we check if the primary user
            // it has just one linked account. And if that's true, then we continue
            // cause then there is no scope for account takeover
            if (primaryUserAssociatedWithEmail.loginMethods.length === 1) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
            }

            // Next we check if there is any login method in which the input email is verified.
            // If that is the case, then it's proven that the user owns the email and we can
            // trust linking of the email password account.
            let emailVerified =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.email === email && lm.verified;
                }) !== undefined;

            if (emailVerified) {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
            }

            // finally, we check if the primary user has any other email / phone number
            // associated with this account - and if it does, then it means that
            // there is a risk of account takeover, so we do not allow the token to be generated
            let hasOtherEmailOrPhone =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.email !== email || lm.phoneNumber !== undefined;
                }) !== undefined;
            if (hasOtherEmailOrPhone) {
                return {
                    status: "PASSWORD_RESET_NOT_ALLOWED",
                    reason: "Token generation was not done because of account take over risk. Please contact support.",
                };
            } else {
                return await generateAndSendPasswordResetToken(emailPasswordAccount.recipeId);
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
                  userId: string;
                  email: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
            | GeneralErrorResponse
        > {
            let newPassword = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.resetPasswordUsingToken({
                token,
                newPassword,
                userContext,
            });

            if (response.status === "OK") {
                let userId = response.userId;
                let email = response.email;
                async function verifyUser(rUserId: string) {
                    const emailVerificationInstance = EmailVerification.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                userId: rUserId,
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
                let user = await getUser(userId);
                if (user === undefined) {
                    throw Error("this error should never be thrown");
                }
                /**
                 * check if the user is a primaryUser
                 */
                if (user.isPrimaryUser) {
                    /**
                     * check if there exists an emailpassword recipe user
                     * associated with the primary user with the same email
                     * which is returned by core in the response
                     */
                    let epUser = user.loginMethods.find((u) => u.email === email && u.recipeId === "emailpassword");
                    if (epUser === undefined) {
                        /**
                         * create a new emailpassword recipe user
                         */
                        let response = await options.recipeImplementation.signUp({
                            email,
                            password: newPassword,
                            userContext,
                            doAccountLinking: false,
                        });
                        if (response.status !== "OK") {
                            throw Error("this error should not be thrown. EP user already for email: " + email);
                        }
                        let recipeUser = response.user;
                        await verifyUser(response.user.id);
                        await linkAccounts(recipeUser.id, user.id, userContext);
                    } else if (!epUser.verified) {
                        await verifyUser(epUser.recipeUserId);
                    }
                } else {
                    /**
                     * it's a recipe user
                     */
                    if (!user.loginMethods[0].verified) {
                        await verifyUser(user.loginMethods[0].recipeUserId);
                    }
                    const session = await Session.getSession(
                        options.req,
                        options.res,
                        { overrideGlobalClaimValidators: () => [], sessionRequired: false },
                        userContext
                    );
                    let result = await AccountLinking.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccountsAfterEmailVerification(
                        {
                            recipeUserId: user.id,
                            session,
                            userContext,
                        }
                    );
                    if (result.createNewSession) {
                        await createNewSession(
                            options.req,
                            options.res,
                            result.primaryUserId,
                            result.recipeUserId,
                            {},
                            {},
                            userContext
                        );
                    }
                }
            }
            return response;
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
            let user = response.user;

            let recipeUser = user.loginMethods.find((u) => u.recipeId === "emailpassword" && u.email === email);

            if (recipeUser === undefined) {
                throw new Error("Should never come here");
            }

            let session = await Session.createNewSession(
                options.req,
                options.res,
                user.id,
                recipeUser.recipeUserId,
                {},
                {},
                userContext
            );
            return {
                status: "OK",
                session,
                user,
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
                  createdNewUser: boolean;
                  createdNewRecipeUser: boolean;
              }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | {
                  status: "SIGNUP_NOT_ALLOWED";
                  reason: string;
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let isSignUpAllowed = await AccountLinking.getInstanceOrThrowError().isSignUpAllowed({
                newUser: {
                    recipeId: "emailpassword",
                    email,
                },
                userContext,
            });

            if (!isSignUpAllowed) {
                return {
                    status: "SIGNUP_NOT_ALLOWED",
                    reason:
                        "The input email is already associated with another account where it is not verified. Please disable automatic account linking, or verify the other account before trying again.",
                };
            }
            let response = await options.recipeImplementation.signUp({
                email,
                password,
                doAccountLinking: true,
                userContext,
            });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let user = response.user;
            let recipeUser = user.loginMethods.find((u) => u.recipeId === "emailpassword" && u.email === email);

            if (recipeUser === undefined) {
                throw new Error("Race condition error - please call this API again");
            }

            let session = await Session.createNewSession(
                options.req,
                options.res,
                user.id,
                recipeUser.recipeUserId,
                {},
                {},
                userContext
            );
            return {
                status: "OK",
                session,
                user,
                createdNewUser: response.createdNewUser,
                createdNewRecipeUser: true,
            };
        },
    };
}
