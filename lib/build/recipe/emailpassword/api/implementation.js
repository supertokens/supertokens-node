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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const session_1 = __importDefault(require("../../session"));
const __1 = require("../../../");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const accountLinkingClaim_1 = require("../../accountlinking/accountLinkingClaim");
const accountlinking_1 = require("../../accountlinking");
const recipeUserId_1 = __importDefault(require("../../../recipeUserId"));
const utils_1 = require("./utils");
function getAPIImplementation() {
    return {
        linkAccountWithUserFromSessionPOST: function ({ formFields, session, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const email = formFields.filter((f) => f.id === "email")[0].value;
                const password = formFields.filter((f) => f.id === "password")[0].value;
                const createRecipeUserFunc = (userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        // this will throw and get caught by the supertokens error handler.
                        yield utils_1.validateFormFieldsOrThrowError(
                            options.config.signUpFeature.formFields,
                            (yield options.req.getJSONBody()).formFields
                        );
                        yield options.recipeImplementation.createNewRecipeUser({
                            email,
                            password,
                            userContext,
                        });
                        // we ignore the result from the above cause after this, function returns,
                        // the linkAccountsWithUserFromSession anyway does recursion..
                    });
                const verifyCredentialsFunc = (userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        const signInResult = yield options.recipeImplementation.signIn({
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
                    });
                let accountLinkingInstance = yield recipe_1.default.getInstance();
                let result = yield accountLinkingInstance.linkAccountWithUserFromSession({
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
                    let toLinkResult = yield accountlinking_1.storeIntoAccountToLinkTable(
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
                    } else if (toLinkResult.status === "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR") {
                        // this can happen due to a race condition wherein
                        // by the time the code comes here, the input primary user is no more a
                        // primary user. So we can do recursion and then linkAccountWithUserFromSession
                        // will try and make the session user a primary user again
                        return this.linkAccountWithUserFromSessionPOST({
                            formFields,
                            session,
                            options,
                            userContext,
                        });
                    }
                    // status: "OK"
                    yield session.setClaimValue(
                        accountLinkingClaim_1.AccountLinkingClaim,
                        result.recipeUserId.getAsString(),
                        userContext
                    );
                    return {
                        status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                        description: "Before accounts can be linked, the new account must be verified",
                    };
                }
                // status: "OK" | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
                return result;
            });
        },
        emailExistsGET: function ({ email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                // this api impl checks for the same email across all recipes
                // and not just email password recipe cause this API is used during
                // sign up, and if we allow sign up with the same email that already exists
                // even though it's not an email password user, then there is a case where
                // if the user clicks on the email verification link after by mistake, and
                // this is an attacker signing up, then the attacker can get access to the account.
                // Instead, the user should go via the password reset flow which will create this
                // account.
                let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    isVerified: false,
                    userContext,
                });
                if (!isSignUpAllowed) {
                    return {
                        status: "OK",
                        exists: true,
                    };
                }
                // even if the above returns true, we still need to check if there
                // exists an email password user with the same email cause the function
                // above does not check for that.
                let users = yield __1.listUsersByAccountInfo({
                    email,
                });
                let emailPasswordUserExists =
                    users.find((u) => {
                        return (
                            u.loginMethods.find((lm) => {
                                return lm.recipeId === "emailpassword";
                            }) !== undefined
                        );
                    }) !== undefined;
                return {
                    status: "OK",
                    exists: emailPasswordUserExists,
                };
            });
        },
        generatePasswordResetTokenPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const email = formFields.filter((f) => f.id === "email")[0].value;
                // this function will be reused in different parts of the flow below..
                function generateAndSendPasswordResetToken(primaryUserId, recipeUserId) {
                    return __awaiter(this, void 0, void 0, function* () {
                        // the user ID here can be primary or recipe level.
                        let response = yield options.recipeImplementation.createResetPasswordToken({
                            userId: recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString(),
                            email,
                            userContext,
                        });
                        if (response.status === "UNKNOWN_USER_ID_ERROR") {
                            logger_1.logDebugMessage(
                                `Password reset email not sent, unknown user id: ${
                                    recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString()
                                }`
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
                    });
                }
                /**
                 * check if primaryUserId is linked with this email
                 */
                let users = yield __1.listUsersByAccountInfo({
                    email,
                });
                // we find the recipe user ID of the email password account from the user's list
                // for later use.
                let emailPasswordAccount = undefined;
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
                        logger_1.logDebugMessage(`Password reset email not sent, unknown user email: ${email}`);
                        return {
                            status: "OK",
                        };
                    }
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
                        emailPasswordAccount.recipeUserId
                    );
                }
                let shouldDoAccountLinkingResponse = yield recipe_1.default
                    .getInstance()
                    .config.shouldDoAutomaticAccountLinking(
                        {
                            recipeId: "emailpassword",
                            email,
                        },
                        primaryUserAssociatedWithEmail,
                        undefined,
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
                        logger_1.logDebugMessage(
                            `Password reset email not sent, since email password user didn't exist, and account linking not enabled`
                        );
                        return {
                            status: "OK",
                        };
                    }
                    let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                        newUser: {
                            recipeId: "emailpassword",
                            email,
                        },
                        isVerified: true,
                        userContext,
                    });
                    if (isSignUpAllowed) {
                        // notice that we pass in the primary user ID here. This means that
                        // we will be creating a new email password account when the token
                        // is consumed and linking it to this primary user.
                        return yield generateAndSendPasswordResetToken(primaryUserAssociatedWithEmail.id, undefined);
                    } else {
                        logger_1.logDebugMessage(
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
                        return lm.recipeUserId.getAsString() === emailPasswordAccount.recipeUserId.getAsString();
                    }) !== undefined;
                if (areTheTwoAccountsLinked) {
                    return yield generateAndSendPasswordResetToken(
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
                // ........................TESTING REMAINING OF THE BELOW CODE........................
                if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                    // here we will go ahead with the token generation cause
                    // even when the token is consumed, we will not be linking the accounts
                    // so no need to check for anything
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
                        emailPasswordAccount.recipeUserId
                    );
                }
                if (!shouldDoAccountLinkingResponse.shouldRequireVerification) {
                    // the checks below are related to email verification, and if the user
                    // does not care about that, then we should just continue with token generation
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
                        emailPasswordAccount.recipeUserId
                    );
                }
                // Now we start the required security checks. First we check if the primary user
                // it has just one linked account. And if that's true, then we continue
                // cause then there is no scope for account takeover
                if (primaryUserAssociatedWithEmail.loginMethods.length === 1) {
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
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
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
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
                            "Token generation was not done because of account take over risk. Please contact support.",
                    };
                } else {
                    return yield generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
                        emailPasswordAccount.recipeUserId
                    );
                }
            });
        },
        passwordResetPOST: function ({ formFields, token, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                function markEmailAsVerified(recipeUserId, email) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const emailVerificationInstance = recipe_2.default.getInstance();
                        if (emailVerificationInstance) {
                            const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                {
                                    recipeUserId,
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
                function doUpdatePassword(recipeUserId) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let updateResponse = yield options.recipeImplementation.updateEmailOrPassword({
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
                                user: existingUser,
                                email: emailForWhomTokenWasGenerated,
                            };
                        }
                    });
                }
                let newPassword = formFields.filter((f) => f.id === "password")[0].value;
                let tokenConsumptionResponse = yield options.recipeImplementation.consumePasswordResetToken({
                    token,
                    userContext,
                });
                if (tokenConsumptionResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
                    return tokenConsumptionResponse;
                }
                let userIdForWhomTokenWasGenerated = tokenConsumptionResponse.userId;
                let emailForWhomTokenWasGenerated = tokenConsumptionResponse.email;
                let existingUser = yield __1.getUser(tokenConsumptionResponse.userId, userContext);
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
                        return doUpdatePassword(new recipeUserId_1.default(userIdForWhomTokenWasGenerated));
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
                        let createUserResponse = yield options.recipeImplementation.createNewRecipeUser({
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
                            yield markEmailAsVerified(
                                createUserResponse.user.loginMethods[0].recipeUserId,
                                tokenConsumptionResponse.email
                            );
                            // Now we try and link the accounts. The function below will try and also
                            // create a primary user of the new account, and if it does that, it's OK..
                            // But in most cases, it will end up linking to existing account since the
                            // email is shared.
                            let linkedToUserId = yield recipe_1.default
                                .getInstance()
                                .createPrimaryUserIdOrLinkAccounts({
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
                                user: yield __1.getUser(linkedToUserId, userContext), // we refetch cause we want to return the user object with the updated login methods.
                            };
                        }
                    }
                } else {
                    // This means that the existing user is not a primary account, which implies that
                    // it must be a non linked email password account. In this case, we simply update the password.
                    // Linking to an existing account will be done after the user goes through the email
                    // verification flow once they log in (if applicable).
                    return doUpdatePassword(new recipeUserId_1.default(userIdForWhomTokenWasGenerated));
                }
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
                let emailPasswordRecipeUser = response.user.loginMethods.find(
                    (u) => u.recipeId === "emailpassword" && u.hasSameEmailAs(email)
                );
                if (emailPasswordRecipeUser === undefined) {
                    // this can happen cause of some race condition, but it's not a big deal.
                    throw new Error("Race condition error - please call this API again");
                }
                let session = yield session_1.default.createNewSession(
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
            });
        },
        signUpPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                // Here we do this check because if the input email already exists with a primary user,
                // then we do not allow sign up, cause even though we do not link this and the existing
                // account right away, and we send an email verification link, the user
                // may click on it by mistake assuming it's for their existing account - resulting
                // in account take over. In this case, we return an EMAIL_ALREADY_EXISTS_ERROR
                // and if the user goes through the forgot password flow, it will create
                // an account there and it will work fine cause there the email is also verified.
                let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    isVerified: false,
                    userContext,
                });
                if (!isSignUpAllowed) {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
                // this function also does account linking
                let response = yield options.recipeImplementation.signUp({
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
                let session = yield session_1.default.createNewSession(
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
            });
        },
    };
}
exports.default = getAPIImplementation;
