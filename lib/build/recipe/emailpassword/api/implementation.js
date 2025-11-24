"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIImplementation;
const logger_1 = require("../../../logger");
const __1 = require("../../../");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const recipeUserId_1 = __importDefault(require("../../../recipeUserId"));
const utils_1 = require("../utils");
const authUtils_1 = require("../../../authUtils");
const utils_2 = require("../../thirdparty/utils");
function getAPIImplementation() {
    return {
        emailExistsGET: async function ({ email, tenantId, userContext }) {
            // even if the above returns true, we still need to check if there
            // exists an email password user with the same email cause the function
            // above does not check for that.
            let users = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });
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
        generatePasswordResetTokenPOST: async function ({ formFields, tenantId, options, userContext }) {
            // NOTE: Check for email being a non-string value. This check will likely
            // never evaluate to `true` as there is an upper-level check for the type
            // in validation but kept here to be safe.
            const emailAsUnknown = formFields.filter((f) => f.id === "email")[0].value;
            if (typeof emailAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateFormFieldsOrThrowError"
                );
            const email = emailAsUnknown;
            // this function will be reused in different parts of the flow below..
            async function generateAndSendPasswordResetToken(primaryUserId, recipeUserId) {
                // the user ID here can be primary or recipe level.
                let response = await options.recipeImplementation.createResetPasswordToken({
                    tenantId,
                    userId: recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString(),
                    email,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    (0, logger_1.logDebugMessage)(
                        `Password reset email not sent, unknown user id: ${
                            recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString()
                        }`
                    );
                    return {
                        status: "OK",
                    };
                }
                let passwordResetLink = (0, utils_1.getPasswordResetLink)({
                    appInfo: options.appInfo,
                    token: response.token,
                    tenantId,
                    request: options.req,
                    userContext,
                });
                (0, logger_1.logDebugMessage)(`Sending password reset email to ${email}`);
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
            let users = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
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
            let linkingCandidate = users.find((u) => u.isPrimaryUser);
            (0, logger_1.logDebugMessage)(
                "generatePasswordResetTokenPOST: primary linking candidate: " +
                    (linkingCandidate === null || linkingCandidate === void 0 ? void 0 : linkingCandidate.id)
            );
            (0, logger_1.logDebugMessage)("generatePasswordResetTokenPOST: linking candidate count " + users.length);
            // If there is no existing primary user and there is a single option to link
            // we see if that user can become primary (and a candidate for linking)
            if (linkingCandidate === undefined && users.length > 0) {
                // If the only user that exists with this email is a non-primary emailpassword user, then we can just let them reset their password, because:
                // we are not going to link anything and there is no risk of account takeover.
                if (
                    users.length === 1 &&
                    users[0].loginMethods[0].recipeUserId.getAsString() ===
                        (emailPasswordAccount === null || emailPasswordAccount === void 0
                            ? void 0
                            : emailPasswordAccount.recipeUserId.getAsString())
                ) {
                    return await generateAndSendPasswordResetToken(
                        emailPasswordAccount.recipeUserId.getAsString(),
                        emailPasswordAccount.recipeUserId
                    );
                }
                const oldestUser = users.sort((a, b) => a.timeJoined - b.timeJoined)[0];
                (0, logger_1.logDebugMessage)(
                    `generatePasswordResetTokenPOST: oldest recipe level-linking candidate: ${oldestUser.id} (w/ ${
                        oldestUser.loginMethods[0].verified ? "verified" : "unverified"
                    } email)`
                );
                // Otherwise, we check if the user can become primary.
                const shouldBecomePrimaryUser = await recipe_1.default
                    .getInstanceOrThrowError()
                    .shouldBecomePrimaryUser(oldestUser, tenantId, undefined, userContext);
                (0, logger_1.logDebugMessage)(
                    `generatePasswordResetTokenPOST: recipe level-linking candidate ${
                        shouldBecomePrimaryUser ? "can" : "can not"
                    } become primary`
                );
                if (shouldBecomePrimaryUser) {
                    linkingCandidate = oldestUser;
                }
            }
            // first we check if there even exists a candidate user that has the input email
            // if not, then we do the regular flow for password reset.
            if (linkingCandidate === undefined) {
                if (emailPasswordAccount === undefined) {
                    (0, logger_1.logDebugMessage)(`Password reset email not sent, unknown user email: ${email}`);
                    return {
                        status: "OK",
                    };
                }
                return await generateAndSendPasswordResetToken(
                    emailPasswordAccount.recipeUserId.getAsString(),
                    emailPasswordAccount.recipeUserId
                );
            }
            /*
            This security measure helps prevent the following attack:
            An attacker has email A and they create an account using TP and it doesn't matter if A is verified or not. Now they create another
            account using EP with email A and verifies it. Both these accounts are linked. Now the attacker changes the email for EP recipe to
            B which makes the EP account unverified, but it's still linked.

            If the real owner of B tries to signup using EP, it will say that the account already exists so they may try to reset password which should be denied,
            because then they will end up getting access to attacker's account and verify the EP account.

            The problem with this situation is if the EP account is verified, it will allow further sign-ups with email B which will also be linked to this primary account,
            that the attacker had created with email A.

            It is important to realize that the attacker had created another account with A because if they hadn't done that, then they wouldn't
            have access to this account after the real user resets the password which is why it is important to check there is another non-EP account
            linked to the primary such that the email is not the same as B.

            Exception to the above is that, if there is a third recipe account linked to the above two accounts and has B as verified, then we should
            allow reset password token generation because user has already proven that the owns the email B
            */
            // First we check if there is any login method in which the input email is verified.
            // If that is the case, then it's proven that the user owns the email and we can
            // trust linking of the email password account.
            let emailVerified =
                linkingCandidate.loginMethods.find((lm) => {
                    return lm.hasSameEmailAs(email) && lm.verified;
                }) !== undefined;
            // then, we check if the primary user has any other email / phone number
            // associated with this account - and if it does, then it means that
            // there is a risk of account takeover, so we do not allow the token to be generated
            let hasOtherEmailOrPhone =
                linkingCandidate.loginMethods.find((lm) => {
                    // we do the extra undefined check below cause
                    // hasSameEmailAs returns false if the lm.email is undefined, and
                    // we want to check that the email is different as opposed to email
                    // not existing in lm.
                    return (lm.email !== undefined && !lm.hasSameEmailAs(email)) || lm.phoneNumber !== undefined;
                }) !== undefined;
            // If we allow this to pass, then:
            // 1. the
            if (!emailVerified && hasOtherEmailOrPhone) {
                return {
                    status: "PASSWORD_RESET_NOT_ALLOWED",
                    reason: "Reset password link was not created because of account take over risk. Please contact support. (ERR_CODE_001)",
                };
            }
            if (linkingCandidate.isPrimaryUser && emailPasswordAccount !== undefined) {
                // If a primary user has the input email as verified or has no other emails then it is always allowed to reset their own password:
                // - there is no risk of account takeover, because they have verified this email or haven't linked it to anything else (checked above this block)
                // - there will be no linking as a result of this action, so we do not need to check for linking (checked here by seeing that the two accounts are already linked)
                let areTheTwoAccountsLinked =
                    linkingCandidate.loginMethods.find((lm) => {
                        return lm.recipeUserId.getAsString() === emailPasswordAccount.recipeUserId.getAsString();
                    }) !== undefined;
                if (areTheTwoAccountsLinked) {
                    return await generateAndSendPasswordResetToken(
                        linkingCandidate.id,
                        emailPasswordAccount.recipeUserId
                    );
                }
            }
            // Here we know that the two accounts are NOT linked. We now need to check for an
            // extra security measure here to make sure that the input email in the primary user
            // is verified, and if not, we need to make sure that there is no other email / phone number
            // associated with the primary user account. If there is, then we do not proceed.
            let shouldDoAccountLinkingResponse = await recipe_1.default
                .getInstanceOrThrowError()
                .config.shouldDoAutomaticAccountLinking(
                    emailPasswordAccount !== undefined
                        ? emailPasswordAccount
                        : {
                              recipeId: "emailpassword",
                              email,
                          },
                    linkingCandidate,
                    undefined,
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
                    (0, logger_1.logDebugMessage)(
                        `Password reset email not sent, since email password user didn't exist, and account linking not enabled`
                    );
                    return {
                        status: "OK",
                    };
                }
                let isSignUpAllowed = await recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                    newUser: {
                        recipeId: "emailpassword",
                        email,
                    },
                    isVerified: true, // cause when the token is consumed, we will mark the email as verified
                    session: undefined,
                    tenantId,
                    userContext,
                });
                if (isSignUpAllowed) {
                    // notice that we pass in the primary user ID here. This means that
                    // we will be creating a new email password account when the token
                    // is consumed and linking it to this primary user.
                    return await generateAndSendPasswordResetToken(linkingCandidate.id, undefined);
                } else {
                    (0, logger_1.logDebugMessage)(
                        `Password reset email not sent, isSignUpAllowed returned false for email: ${email}`
                    );
                    return {
                        status: "OK",
                    };
                }
            }
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
            // Here we accounted for both `shouldRequireVerification` by the above checks (where we return ERR_CODE_001)
            return await generateAndSendPasswordResetToken(linkingCandidate.id, emailPasswordAccount.recipeUserId);
        },
        passwordResetPOST: async function ({ formFields, token, tenantId, options, userContext }) {
            async function markEmailAsVerified(recipeUserId, email) {
                const emailVerificationInstance = recipe_2.default.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse =
                        await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken({
                            tenantId,
                            recipeUserId,
                            email,
                            userContext,
                        });
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
            async function doUpdatePasswordAndVerifyEmailAndTryLinkIfNotPrimary(recipeUserId) {
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
                    // If the update was successful, we try to mark the email as verified.
                    // We do this because we assume that the password reset token was delivered by email (and to the appropriate email address)
                    // so consuming it means that the user actually has access to the emails we send.
                    // We only do this if the password update was successful, otherwise the following scenario is possible:
                    // 1. User M: signs up using the email of user V with their own password. They can't validate the email, because it is not their own.
                    // 2. User A: tries signing up but sees the email already exists message
                    // 3. User A: resets their password, but somehow this fails (e.g.: password policy issue)
                    // If we verified (and linked) the existing user with the original password, User M would get access to the current user and any linked users.
                    await markEmailAsVerified(recipeUserId, emailForWhomTokenWasGenerated);
                    // We refresh the user information here, because the verification status may be updated, which is used during linking.
                    const updatedUserAfterEmailVerification = await (0, __1.getUser)(
                        recipeUserId.getAsString(),
                        userContext
                    );
                    if (updatedUserAfterEmailVerification === undefined) {
                        throw new Error("Should never happen - user deleted after during password reset");
                    }
                    if (updatedUserAfterEmailVerification.isPrimaryUser) {
                        // If the user is already primary, we do not need to do any linking
                        return {
                            status: "OK",
                            email: emailForWhomTokenWasGenerated,
                            user: updatedUserAfterEmailVerification,
                        };
                    }
                    // If the user was not primary:
                    // Now we try and link the accounts.
                    // The function below will try and also create a primary user of the new account, this can happen if:
                    // 1. the user was unverified and linking requires verification
                    // We do not take try linking by session here, since this is supposed to be called without a session
                    const linkRes = await recipe_1.default
                        .getInstanceOrThrowError()
                        .tryLinkingByAccountInfoOrCreatePrimaryUser({
                            tenantId,
                            inputUser: updatedUserAfterEmailVerification,
                            session: undefined,
                            userContext,
                        });
                    const userAfterWeTriedLinking =
                        linkRes.status === "OK" ? linkRes.user : updatedUserAfterEmailVerification;
                    return {
                        status: "OK",
                        email: emailForWhomTokenWasGenerated,
                        user: userAfterWeTriedLinking,
                    };
                }
            }
            // NOTE: Check for password being a non-string value. This check will likely
            // never evaluate to `true` as there is an upper-level check for the type
            // in validation but kept here to be safe.
            const newPasswordAsUnknown = formFields.filter((f) => f.id === "password")[0].value;
            if (typeof newPasswordAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the password value is a string in validateFormFieldsOrThrowError"
                );
            let newPassword = newPasswordAsUnknown;
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
            let existingUser = await (0, __1.getUser)(userIdForWhomTokenWasGenerated, userContext);
            if (existingUser === undefined) {
                // This should happen only cause of a race condition where the user
                // might be deleted before token creation and consumption.
                // Also note that this being undefined doesn't mean that the email password
                // user does not exist, but it means that there is no recipe or primary user
                // for whom the token was generated.
                return {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                };
            }
            let tokenGeneratedForEmailPasswordUser = existingUser.loginMethods.some((lm) => {
                // we check based on user ID and not email because the only time the user ID of another login method
                // is used for token generation is if the email password user did not exist - in which case the
                // value of emailPasswordUserIsLinkedToExistingUser will resolve to false anyway, and that's what we want.
                // there is an edge case where if the email password recipe user was created
                // after the password reset token generation, and it was linked to the
                // primary user id (userIdForWhomTokenWasGenerated), in this case,
                // we still don't allow password update, cause the user should try again
                // and the token should be regenerated for the right recipe user.
                return (
                    lm.recipeUserId.getAsString() === userIdForWhomTokenWasGenerated && lm.recipeId === "emailpassword"
                );
            });
            if (tokenGeneratedForEmailPasswordUser) {
                if (!existingUser.isPrimaryUser) {
                    // If this is a recipe level emailpassword user, we can always allow them to reset their password.
                    return doUpdatePasswordAndVerifyEmailAndTryLinkIfNotPrimary(
                        new recipeUserId_1.default(userIdForWhomTokenWasGenerated)
                    );
                }
                // If the user is a primary user resetting the password of an emailpassword user linked to it
                // we need to check for account takeover risk (similar to what we do when generating the token)
                // We check if there is any login method in which the input email is verified.
                // If that is the case, then it's proven that the user owns the email and we can
                // trust linking of the email password account.
                let emailVerified =
                    existingUser.loginMethods.find((lm) => {
                        return lm.hasSameEmailAs(emailForWhomTokenWasGenerated) && lm.verified;
                    }) !== undefined;
                // finally, we check if the primary user has any other email / phone number
                // associated with this account - and if it does, then it means that
                // there is a risk of account takeover, so we do not allow the token to be generated
                let hasOtherEmailOrPhone =
                    existingUser.loginMethods.find((lm) => {
                        // we do the extra undefined check below cause
                        // hasSameEmailAs returns false if the lm.email is undefined, and
                        // we want to check that the email is different as opposed to email
                        // not existing in lm.
                        return (
                            (lm.email !== undefined && !lm.hasSameEmailAs(emailForWhomTokenWasGenerated)) ||
                            lm.phoneNumber !== undefined
                        );
                    }) !== undefined;
                if (!emailVerified && hasOtherEmailOrPhone) {
                    // We can return an invalid token error, because in this case the token should not have been created
                    // whenever they try to re-create it they'll see the appropriate error message
                    return {
                        status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                    };
                }
                // since this doesn't result in linking and there is no risk of account takeover, we can allow the password reset to proceed
                return doUpdatePasswordAndVerifyEmailAndTryLinkIfNotPrimary(
                    new recipeUserId_1.default(userIdForWhomTokenWasGenerated)
                );
            }
            // this means that the existingUser is primary but does not have an emailpassword user associated
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
                const updatedUser = await (0, __1.getUser)(createUserResponse.user.id, userContext);
                if (updatedUser === undefined) {
                    throw new Error("Should never happen - user deleted after during password reset");
                }
                createUserResponse.user = updatedUser;
                // Now we try and link the accounts. The function below will try and also
                // create a primary user of the new account, and if it does that, it's OK..
                // But in most cases, it will end up linking to existing account since the
                // email is shared.
                // We do not take try linking by session here, since this is supposed to be called without a session
                // Still, the session object is passed around because it is a required input for shouldDoAutomaticAccountLinking
                const linkRes = await recipe_1.default
                    .getInstanceOrThrowError()
                    .tryLinkingByAccountInfoOrCreatePrimaryUser({
                        tenantId,
                        inputUser: createUserResponse.user,
                        session: undefined,
                        userContext,
                    });
                const userAfterLinking = linkRes.status === "OK" ? linkRes.user : createUserResponse.user;
                if (linkRes.status === "OK" && linkRes.user.id !== existingUser.id) {
                    // this means that the account we just linked to
                    // was not the one we had expected to link it to. This can happen
                    // due to some race condition or the other.. Either way, this
                    // is not an issue and we can just return OK
                }
                return {
                    status: "OK",
                    email: tokenConsumptionResponse.email,
                    user: userAfterLinking,
                };
            }
        },
        signInPOST: async function ({
            formFields,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            options,
            userContext,
        }) {
            const errorCodeMap = {
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in due to security reasons. Please try resetting your password, use a different login method or contact support. (ERR_CODE_008)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_009)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_010)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_011)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)",
                },
            };
            const emailAsUnknown = formFields.filter((f) => f.id === "email")[0].value;
            const passwordAsUnknown = formFields.filter((f) => f.id === "password")[0].value;
            // NOTE: Following checks will likely never throw an error as the
            // check for type is done in a parent function but they are kept
            // here to be on the safe side.
            if (typeof emailAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateFormFieldsOrThrowError"
                );
            if (typeof passwordAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the password value is a string in validateFormFieldsOrThrowError"
                );
            let email = emailAsUnknown;
            let password = passwordAsUnknown;
            const recipeId = "emailpassword";
            const checkCredentialsOnTenant = async (tenantId) => {
                return (
                    (await options.recipeImplementation.verifyCredentials({ email, password, tenantId, userContext }))
                        .status === "OK"
                );
            };
            if ((0, utils_2.isFakeEmail)(email) && session === undefined) {
                // Fake emails cannot be used as a first factor
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
            const authenticatingUser = await authUtils_1.AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired(
                {
                    accountInfo: { email },
                    userContext,
                    recipeId,
                    session,
                    tenantId,
                    checkCredentialsOnTenant,
                }
            );
            const isVerified = authenticatingUser !== undefined && authenticatingUser.loginMethod.verified;
            // We check this before preAuthChecks, because that function assumes that if isSignUp is false,
            // then authenticatingUser is defined. While it wouldn't technically cause any problems with
            // the implementation of that function, this way we can guarantee that either isSignInAllowed or
            // isSignUpAllowed will be called as expected.
            if (authenticatingUser === undefined) {
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId,
                    email,
                },
                factorIds: ["emailpassword"],
                isSignUp: false,
                authenticatingUser:
                    authenticatingUser === null || authenticatingUser === void 0 ? void 0 : authenticatingUser.user,
                isVerified,
                signInVerifiesLoginMethod: false,
                skipSessionUserUpdateInCore: false,
                tenantId,
                userContext,
                session,
                shouldTryLinkingWithSessionUser,
            });
            if (preAuthChecks.status === "SIGN_UP_NOT_ALLOWED") {
                throw new Error("This should never happen: pre-auth checks should not fail for sign in");
            }
            if (preAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            if ((0, utils_2.isFakeEmail)(email) && preAuthChecks.isFirstFactor) {
                // Fake emails cannot be used as a first factor
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
            const signInResponse = await options.recipeImplementation.signIn({
                email,
                password,
                session,
                shouldTryLinkingWithSessionUser,
                tenantId,
                userContext,
            });
            if (signInResponse.status === "WRONG_CREDENTIALS_ERROR") {
                return signInResponse;
            }
            if (signInResponse.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    signInResponse,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                authenticatedUser: signInResponse.user,
                recipeUserId: signInResponse.recipeUserId,
                isSignUp: false,
                factorId: "emailpassword",
                session,
                req: options.req,
                res: options.res,
                tenantId,
                userContext,
            });
            if (postAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            return {
                status: "OK",
                session: postAuthChecks.session,
                user: postAuthChecks.user,
            };
        },
        signUpPOST: async function ({
            formFields,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            options,
            userContext,
        }) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_014)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_015)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)",
                },
            };
            const emailAsUnknown = formFields.filter((f) => f.id === "email")[0].value;
            const passwordAsUnknown = formFields.filter((f) => f.id === "password")[0].value;
            // NOTE: Following checks will likely never throw an error as the
            // check for type is done in a parent function but they are kept
            // here to be on the safe side.
            if (typeof emailAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateFormFieldsOrThrowError"
                );
            if (typeof passwordAsUnknown !== "string")
                throw new Error(
                    "Should never come here since we already check that the password value is a string in validateFormFieldsOrThrowError"
                );
            let email = emailAsUnknown;
            let password = passwordAsUnknown;
            const preAuthCheckRes = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId: "emailpassword",
                    email,
                },
                factorIds: ["emailpassword"],
                isSignUp: true,
                isVerified: (0, utils_2.isFakeEmail)(email),
                signInVerifiesLoginMethod: false,
                skipSessionUserUpdateInCore: false,
                authenticatingUser: undefined, // since this a sign up, this is undefined
                tenantId,
                userContext,
                session,
                shouldTryLinkingWithSessionUser,
            });
            if (preAuthCheckRes.status === "SIGN_UP_NOT_ALLOWED") {
                const conflictingUsers = await recipe_1.default
                    .getInstanceOrThrowError()
                    .recipeInterfaceImpl.listUsersByAccountInfo({
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
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            }
            if (preAuthCheckRes.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthCheckRes,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
            }
            if ((0, utils_2.isFakeEmail)(email) && preAuthCheckRes.isFirstFactor) {
                // Fake emails cannot be used as a first factor
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            const signUpResponse = await options.recipeImplementation.signUp({
                tenantId,
                email,
                password,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            });
            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return signUpResponse;
            }
            if (signUpResponse.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    signUpResponse,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
            }
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                authenticatedUser: signUpResponse.user,
                recipeUserId: signUpResponse.recipeUserId,
                isSignUp: true,
                factorId: "emailpassword",
                session,
                req: options.req,
                res: options.res,
                tenantId,
                userContext,
            });
            if (postAuthChecks.status !== "OK") {
                // It should never actually come here, but we do it cause of consistency.
                // If it does come here (in case there is a bug), it would make this func throw
                // anyway, cause there is no SIGN_IN_NOT_ALLOWED in the errorCodeMap.
                authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
                throw new Error("This should never happen");
            }
            return {
                status: "OK",
                session: postAuthChecks.session,
                user: postAuthChecks.user,
            };
        },
    };
}
