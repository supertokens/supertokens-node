"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const session_1 = require("../../session");
const __1 = require("../../../");
const recipe_1 = require("../../accountlinking/recipe");
const recipe_2 = require("../../emailverification/recipe");
function getAPIImplementation() {
    return {
        linkAccountToExistingAccountPOST: function ({ formFields, session, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let result = yield recipe_1.default.getInstanceOrThrowError().accountLinkPostSignInViaSession({
                    session,
                    info: {
                        email,
                        recipeId: "emailpassword",
                    },
                    infoVerified: false,
                    userContext,
                });
                let createdNewRecipeUser = false;
                if (result.createRecipeUser) {
                    let password = formFields.filter((f) => f.id === "password")[0].value;
                    let response = yield options.recipeImplementation.signUp({ email, password, userContext });
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
                        result = yield recipe_1.default.getInstanceOrThrowError().accountLinkPostSignInViaSession({
                            session,
                            info: {
                                email,
                                recipeId: "emailpassword",
                            },
                            infoVerified: false,
                            userContext,
                        });
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
                let user = yield __1.getUser(session.getUserId());
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
            });
        },
        emailExistsGET: function ({ email, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.getUserByEmail({ email, userContext });
                return {
                    status: "OK",
                    exists: user !== undefined,
                };
            });
        },
        generatePasswordResetTokenPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let userIdForPasswordReset = undefined;
                let recipeUserId = undefined;
                /**
                 * check if primaryUserId is linked with this email
                 */
                let users = yield __1.listUsersByAccountInfo({
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
                                let shouldDoAccountLinking = yield recipe_1.default
                                    .getInstanceOrThrowError()
                                    .config.shouldDoAutomaticAccountLinking(
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
                                let identitiesForPrimaryUser = recipe_1.default
                                    .getInstanceOrThrowError()
                                    .getIdentitiesForUser(primaryUser);
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
                            let shouldDoAccountLinking = yield recipe_1.default
                                .getInstanceOrThrowError()
                                .config.shouldDoAutomaticAccountLinking(
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
                                    let identitiesForPrimaryUser = recipe_1.default
                                        .getInstanceOrThrowError()
                                        .getIdentitiesForUser(primaryUser);
                                    if (!identitiesForPrimaryUser.verified.emails.includes(email)) {
                                        /**
                                         * the email is not verified for any account linked to the primary user.
                                         * so we check if there exists any account linked with the primary user
                                         * which doesn't have this email as identifying info
                                         */
                                        let differentIdentityUser = primaryUser.loginMethods.find(
                                            (u) => u.email !== email
                                        );
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
                let response = yield options.recipeImplementation.createResetPasswordToken({
                    userId: userIdForPasswordReset,
                    email,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    logger_1.logDebugMessage(
                        `Password reset email not sent, unknown user id: ${userIdForPasswordReset}`
                    );
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
                logger_1.logDebugMessage(`Sending password reset email to ${email}`);
                yield options.emailDelivery.ingredientInterfaceImpl.sendEmail({
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
            });
        },
        passwordResetPOST: function ({ formFields, token, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let newPassword = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.resetPasswordUsingToken({
                    token,
                    newPassword,
                    userContext,
                });
                if (response.status === "OK") {
                    let userId = response.userId;
                    let email = response.email;
                    function verifyUser(rUserId) {
                        return __awaiter(this, void 0, void 0, function* () {
                            const emailVerificationInstance = recipe_2.default.getInstance();
                            if (emailVerificationInstance) {
                                const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                    {
                                        userId: rUserId,
                                        email,
                                        userContext,
                                    }
                                );
                                if (tokenResponse.status === "OK") {
                                    yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                        token: tokenResponse.token,
                                        userContext,
                                    });
                                }
                            }
                        });
                    }
                    let user = yield __1.getUser(userId);
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
                            let response = yield options.recipeImplementation.signUp({
                                email,
                                password: newPassword,
                                userContext,
                            });
                            if (response.status !== "OK") {
                                throw Error("this error should not be thrown. EP user already for email: " + email);
                            }
                            let recipeUser = response.user;
                            yield verifyUser(response.user.id);
                            yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
                                recipeUserId: recipeUser.id,
                                primaryUserId: user.id,
                                userContext,
                            });
                        } else if (!epUser.verified) {
                            yield verifyUser(epUser.id);
                        }
                    } else {
                        /**
                         * it's a recipe user
                         */
                        if (!user.loginMethods[0].verified) {
                            yield verifyUser(user.loginMethods[0].id);
                        }
                        const session = yield session_1.default.getSession(
                            options.req,
                            options.res,
                            { overrideGlobalClaimValidators: () => [], sessionRequired: false },
                            userContext
                        );
                        yield recipe_1.default.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccounts({
                            recipeUserId: user.id,
                            session,
                            userContext,
                        });
                    }
                }
                return response;
            });
        },
        signInPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.signIn({ email, password, userContext });
                if (response.status === "WRONG_CREDENTIALS_ERROR") {
                    return response;
                }
                let user = response.user;
                let session = yield session_1.default.createNewSession(
                    options.res,
                    user.id,
                    user.recipeUserId,
                    {},
                    {},
                    userContext
                );
                return {
                    status: "OK",
                    session,
                    user,
                };
            });
        },
        signUpPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let isSignUpAllowed = yield recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                    info: {
                        recipeId: "emailpassword",
                        email,
                    },
                    userContext,
                });
                if (!isSignUpAllowed) {
                    return {
                        status: "SIGNUP_NOT_ALLOWED",
                        reason: "the sign-up info is already associated with another account where it is not verified",
                    };
                }
                let response = yield options.recipeImplementation.signUp({ email, password, userContext });
                if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return response;
                }
                let user = response.user;
                let userIdForSession = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .doPostSignUpAccountLinkingOperations({
                        info: {
                            email,
                            recipeId: "emailpassword",
                        },
                        recipeUserId: user.id,
                        userContext,
                        infoVerified: false,
                    });
                let session = yield session_1.default.createNewSession(
                    options.res,
                    userIdForSession,
                    user.recipeUserId,
                    {},
                    {},
                    userContext
                );
                return {
                    status: "OK",
                    session,
                    user,
                    createdNewUser: userIdForSession === user.recipeUserId,
                    createdNewRecipeUser: true,
                };
            });
        },
    };
}
exports.default = getAPIImplementation;
