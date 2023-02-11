import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";
import { listUsersByAccountInfo, getUser } from "../../../";
import AccountLinking from "../../accountlinking";
import EmailVerification from "../../emailverification/recipe";

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
                  user: User;
                  createdNewRecipeUser: boolean;
                  session: SessionContainerInterface;
                  wereAccountsAlreadyLinked: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                  description: string;
              }
            | {
                  status: "ACCOUNT_NOT_VERIFIED_ERROR";
                  isNotVerifiedAccountFromInputSession: boolean;
                  description: string;
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let result = await AccountLinking.accountLinkPostSignInViaSession(
                session,
                {
                    email,
                    recipeId: "emailpassword",
                },
                false,
                userContext
            );
            let createdNewRecipeUser = false;
            if (result.createRecipeUser) {
                let password = formFields.filter((f) => f.id === "password")[0].value;

                let response = await options.recipeImplementation.signUp({
                    email,
                    password,
                    doAccountLinking: false,
                    userContext,
                });
                if (response.status !== "OK") {
                    throw Error(
                        `this error should never be thrown while creating a new user during accountLinkPostSignInViaSession flow: ${response.status}`
                    );
                }
                createdNewRecipeUser = true;
                if (result.updateVerificationClaim) {
                    // TODO: update session verification claim
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: false,
                        description: "",
                    };
                } else {
                    result = await AccountLinking.accountLinkPostSignInViaSession(
                        session,
                        {
                            email,
                            recipeId: "emailpassword",
                        },
                        false,
                        userContext
                    );
                }
            }
            if (result.createRecipeUser) {
                throw Error(
                    `this error should never be thrown after creating a new user during accountLinkPostSignInViaSession flow`
                );
            }
            if (!result.accountsLinked) {
                if (result.reason === "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: true,
                        description: "",
                    };
                }
                if (result.reason === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: false,
                        description: "",
                    };
                }
                if (
                    result.reason === "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                    result.reason === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
                    return {
                        status: result.reason,
                        description: "",
                        primaryUserId: result.primaryUserId,
                    };
                }
                return {
                    status: result.reason,
                    description: "",
                };
            }
            let wereAccountsAlreadyLinked = false;
            if (result.updateVerificationClaim) {
                // TODO: remove session claim
            } else {
                wereAccountsAlreadyLinked = true;
            }
            let user = await getUser(session.getUserId());
            if (user === undefined) {
                throw Error(
                    "this error should never be thrown. Can't find primary user with userId: " + session.getUserId()
                );
            }
            let recipeUser = user.loginMethods.find((u) => u.recipeId === "emailpassword" && u.email === email);
            if (recipeUser === undefined) {
                throw Error(
                    "this error should never be thrown. Can't find emailPassword recipeUser with email: " +
                        email +
                        "  and primary userId: " +
                        session.getUserId()
                );
            }
            return {
                status: "OK",
                user: {
                    id: user.id,
                    recipeUserId: recipeUser.id,
                    timeJoined: recipeUser.timeJoined,
                    email,
                },
                createdNewRecipeUser,
                wereAccountsAlreadyLinked,
                session,
            };
        },
        emailExistsGET: async function ({
            email,
            options,
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
            let user = await options.recipeImplementation.getUserByEmail({ email, userContext });

            return {
                status: "OK",
                exists: user !== undefined,
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
            let recipeUserId: string | undefined = undefined;

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
                            let shouldDoAccountLinking = await AccountLinking.shouldDoAutomaticAccountLinking(
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
                            let identitiesForPrimaryUser = AccountLinking.getIdentitiesForUser(primaryUser);
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
                        let shouldDoAccountLinking = await AccountLinking.shouldDoAutomaticAccountLinking(
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
                                let identitiesForPrimaryUser = AccountLinking.getIdentitiesForUser(primaryUser);
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
                        await AccountLinking.linkAccounts(recipeUser.id, user.id, userContext);
                    } else if (!epUser.verified) {
                        await verifyUser(epUser.id);
                    }
                } else {
                    /**
                     * it's a recipe user
                     */
                    if (!user.loginMethods[0].verified) {
                        await verifyUser(user.loginMethods[0].id);
                    }
                    const session = await Session.getSession(
                        options.req,
                        options.res,
                        { overrideGlobalClaimValidators: () => [], sessionRequired: false },
                        userContext
                    );
                    await AccountLinking.createPrimaryUserIdOrLinkAccounts(user.id, session, userContext);
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

            let session = await Session.createNewSession(options.req, options.res, user.id,  user.recipeUserId, {}, {}, userContext);
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

            let isSignUpAllowed = await AccountLinking.isSignUpAllowed(
                {
                    recipeId: "emailpassword",
                    email,
                },
                userContext
            );

            if (!isSignUpAllowed) {
                return {
                    status: "SIGNUP_NOT_ALLOWED",
                    reason: "the sign-up info is already associated with another account where it is not verified",
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

            let session = await Session.createNewSession(options.req, options.res, user.id,  user.recipeUserId, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
                createdNewUser: user.id === user.recipeUserId,
                createdNewRecipeUser: true,
            };
        },
    };
}
