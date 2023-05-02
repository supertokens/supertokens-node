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

            // if a user already exists with the input email, we first
            // verify the credentials.
            const usersWithSameEmail = await listUsersByAccountInfo(
                {
                    email,
                },
                userContext
            );

            const newUser = usersWithSameEmail.find((user) => {
                return (
                    user.loginMethods.find((lM) => {
                        return lM.recipeId === "emailpassword" && lM.email === email;
                    }) !== undefined
                );
            });

            if (newUser !== undefined) {
                let signInResult = await options.recipeImplementation.signIn({
                    email,
                    password,
                    userContext,
                });
                if (signInResult.status === "WRONG_CREDENTIALS_ERROR") {
                    return signInResult;
                }
            }

            const createRecipeUserFunc = async (): Promise<
                | { status: "OK" }
                | {
                      status: "CUSTOM_RESPONSE_FROM_CREATE_USER";
                      resp: { status: "WRONG_CREDENTIALS_ERROR" };
                  }
            > => {
                let result = await options.recipeImplementation.createNewRecipeUser({
                    email,
                    password,
                    userContext,
                });
                if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    // this can happen in a race condition wherein the user is already created
                    // by the time it reaches here in the function call for linkAccountsWithUserFromSession
                    let signInResult = await options.recipeImplementation.signIn({
                        email,
                        password,
                        userContext,
                    });
                    if (signInResult.status === "WRONG_CREDENTIALS_ERROR") {
                        return {
                            status: "CUSTOM_RESPONSE_FROM_CREATE_USER",
                            resp: signInResult,
                        };
                    }
                }
                return {
                    status: "OK",
                };
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
                userContext,
            });
            if (result.status === "CUSTOM_RESPONSE_FROM_CREATE_USER") {
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
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let userIdForPasswordReset: string | undefined = undefined;
            let recipeUserId: string;

            /**
             * check if primaryUserId is linked with this email
             */
            let users = await listUsersByAccountInfo({
                email,
            });
            if (users !== undefined) {
                let primaryUser = users.find((u) => u.isPrimaryUser);
                if (primaryUser !== undefined) {
                    /**
                     * checking if emailpassword user exists for the input email and associated with the primaryUserId
                     */
                    let epUser = primaryUser.loginMethods.find((l) => l.recipeId === "emailpassword");
                    if (epUser === undefined) {
                        /**
                         * this means no emailpassword user is associated with the primaryUserId which
                         * has the input email as identifying info
                         * now checking if emailpassword user exists for the input email
                         */
                        let epRecipeUser = users.find(
                            (u) => u.loginMethods.find((l) => l.recipeId === "emailpassword") !== undefined
                        );
                        if (epRecipeUser === undefined) {
                            /**
                             * this means that there is no emailpassword recipe user for the input email
                             * so we check is account linking is enabled for the given email and primaryUserId
                             */
                            let shouldDoAccountLinking = await AccountLinking.getInstanceOrThrowError().config.shouldDoAutomaticAccountLinking(
                                {
                                    email,
                                    recipeId: "emailpassword",
                                },
                                primaryUser,
                                undefined,
                                userContext
                            );
                            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                                /**
                                 * here, reset password token generation is not allowed
                                 * and we have decided to return "OK" status
                                 */
                                return {
                                    status: "OK",
                                };
                            }
                            let identitiesForPrimaryUser = AccountLinking.getInstanceOrThrowError().transformUserInfoIntoVerifiedAndUnverifiedBucket(
                                primaryUser
                            );
                            /**
                             * if input email doens't belong to the verified indentity for the primaryUser,
                             * we need to check shouldRequireVerification boolean
                             */
                            if (!identitiesForPrimaryUser.verified.emails.includes(email)) {
                                if (shouldDoAccountLinking.shouldRequireVerification) {
                                    /**
                                     * here, reset password token generation is not allowed
                                     * an
                                     */
                                    return {
                                        status: "OK",
                                    };
                                }
                            }
                            userIdForPasswordReset = primaryUser.id;
                            recipeUserId = primaryUser.id;
                        } else {
                            /**
                             * this means emailpassword user associated with the input email exists but it
                             * is currently not associated with the primaryUserId we found in the
                             * previous step. We simply generate password reset token for such user
                             */
                            userIdForPasswordReset = epRecipeUser.id;
                            recipeUserId = epRecipeUser.id;
                        }
                    } else {
                        /**
                         * the primaryUserId associated with the email has a linked
                         * emailpassword recipe user with same email
                         */
                        recipeUserId = epUser.recipeUserId;
                        /**
                         * checking for shouldDoAccountLinking
                         */
                        let shouldDoAccountLinking = await AccountLinking.getInstanceOrThrowError().config.shouldDoAutomaticAccountLinking(
                            {
                                email,
                                recipeId: "emailpassword",
                            },
                            primaryUser,
                            undefined,
                            userContext
                        );
                        let shouldRequireVerification = shouldDoAccountLinking.shouldAutomaticallyLink
                            ? shouldDoAccountLinking.shouldRequireVerification
                            : false;
                        if (shouldRequireVerification) {
                            /**
                             * if verification is required, we check if this is EP user is
                             * the only user associated with the primaryUserId.
                             */
                            if (primaryUser.loginMethods.length > 1) {
                                /**
                                 * checking if the email belongs to the verified identities for the
                                 * primary user
                                 */
                                let identitiesForPrimaryUser = AccountLinking.getInstanceOrThrowError().transformUserInfoIntoVerifiedAndUnverifiedBucket(
                                    primaryUser
                                );
                                if (!identitiesForPrimaryUser.verified.emails.includes(email)) {
                                    /**
                                     * the email is not verified for any account linked to the primary user.
                                     * so we check if there exists any account linked with the primary user
                                     * which doesn't have this email as identifying info
                                     */
                                    let differentIdentityUser = primaryUser.loginMethods.find((u) => u.email !== email);
                                    if (differentIdentityUser !== undefined) {
                                        /**
                                         * if any such user found, we return status to contact support
                                         */
                                        return {
                                            status: "GENERAL_ERROR",
                                            message: "Password Reset Not Allowed. Please contact support.",
                                        };
                                    }
                                }
                            }
                        }
                        userIdForPasswordReset = primaryUser.id;
                    }
                } else {
                    /**
                     * no primaryUser exists for the given email. So we just find the
                     * associated emailpasword user, if exists
                     */
                    let epRecipeUser = users.find(
                        (u) => u.loginMethods.find((l) => l.recipeId === "emailpassword") !== undefined
                    );
                    if (epRecipeUser === undefined) {
                        return {
                            status: "OK",
                        };
                    }
                    userIdForPasswordReset = epRecipeUser.id;
                    recipeUserId = epRecipeUser.id;
                }
            } else {
                return {
                    status: "OK",
                };
            }

            let response = await options.recipeImplementation.createResetPasswordToken({
                userId: userIdForPasswordReset,
                email,
                userContext,
            });
            if (response.status === "UNKNOWN_USER_ID_ERROR") {
                logDebugMessage(`Password reset email not sent, unknown user id: ${userIdForPasswordReset}`);
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
                    id: userIdForPasswordReset,
                    recipeUserId,
                    email,
                },
                passwordResetLink,
                userContext,
            });

            return {
                status: "OK",
            };
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
