"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const querier_1 = require("../../querier");
const error_1 = __importDefault(require("../../error"));
const processState_1 = require("../../processState");
const logger_1 = require("../../logger");
const recipe_1 = __importDefault(require("../emailverification/recipe"));
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.getPrimaryUserThatCanBeLinkedToRecipeUserId = async ({ tenantId, user, userContext }) => {
            // first we check if this user itself is a primary user or not. If it is, we return that.
            if (user.isPrimaryUser) {
                return user;
            }
            // then, we try and find a primary user based on the email / phone number / third party ID / credentialId.
            let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: Object.assign(Object.assign({}, user.loginMethods[0]), {
                    // we don't need to list by (webauthn) credentialId because we are looking for
                    // a user to link to the current recipe user, but any search using the credentialId
                    // of the current user "will identify the same user" which is the current one.
                    webauthn: undefined,
                }),
                doUnionOfAccountInfo: true,
                userContext,
            });
            (0, logger_1.logDebugMessage)(
                `getPrimaryUserThatCanBeLinkedToRecipeUserId found ${users.length} matching users`
            );
            let pUsers = users.filter((u) => u.isPrimaryUser);
            (0, logger_1.logDebugMessage)(
                `getPrimaryUserThatCanBeLinkedToRecipeUserId found ${pUsers.length} matching primary users`
            );
            if (pUsers.length > 1) {
                // this means that the new user has account info such that it's
                // spread across multiple primary user IDs. In this case, even
                // if we return one of them, it won't be able to be linked anyway
                // cause if we did, it would mean 2 primary users would have the
                // same account info. So we return undefined
                /**
                 * this being said, with the current set of auth recipes, it should
                 * never come here - cause:
                 * ----> If the recipeuserid is a passwordless user, then it can have either a phone
                 * email or both. If it has just one of them, then anyway 2 primary users can't
                 * exist with the same phone number / email. If it has both, then the only way
                 * that it can have multiple primary users returned is if there is another passwordless
                 * primary user with the same phone number - which is not possible, cause phone
                 * numbers are unique across passwordless users.
                 *
                 * ----> If the input is a third party user, then it has third party info and an email. Now there can be able to primary user with the same email, but
                 * there can't be another thirdparty user with the same third party info (since that is unique).
                 * Nor can there an email password primary user with the same email along with another
                 * thirdparty primary user with the same email (since emails can't be the same across primary users).
                 *
                 * ----> If the input is an email password user, then it has an email. There can't be multiple primary users with the same email anyway.
                 */
                throw new Error("You found a bug. Please report it on github.com/supertokens/supertokens-node");
            }
            return pUsers.length === 0 ? undefined : pUsers[0];
        };
        this.getOldestUserThatCanBeLinkedToRecipeUser = async ({ tenantId, user, userContext }) => {
            // first we check if this user itself is a primary user or not. If it is, we return that since it cannot be linked to anything else
            if (user.isPrimaryUser) {
                return user;
            }
            // then, we try and find matching users based on the email / phone number / third party ID.
            let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: Object.assign(Object.assign({}, user.loginMethods[0]), {
                    // we don't need to list by (webauthn) credentialId because we are looking for
                    // a user to link to the current recipe user, but any search using the credentialId
                    // of the current user "will identify the same user" which is the current one.
                    webauthn: undefined,
                }),
                doUnionOfAccountInfo: true,
                userContext,
            });
            (0, logger_1.logDebugMessage)(
                `getOldestUserThatCanBeLinkedToRecipeUser found ${users.length} matching users`
            );
            // finally select the oldest one
            const oldestUser =
                users.length === 0
                    ? undefined
                    : users.reduce((min, curr) => (min.timeJoined < curr.timeJoined ? min : curr));
            return oldestUser;
        };
        this.isSignInAllowed = async ({
            user,
            accountInfo,
            tenantId,
            session,
            signInVerifiesLoginMethod,
            userContext,
        }) => {
            processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED);
            if (user.isPrimaryUser || user.loginMethods[0].verified || signInVerifiesLoginMethod) {
                return true;
            }
            return this.isSignInUpAllowedHelper({
                accountInfo,
                isVerified: user.loginMethods[0].verified,
                session,
                tenantId,
                isSignIn: true,
                user,
                userContext,
            });
        };
        this.isSignUpAllowed = async ({ newUser, isVerified, session, tenantId, userContext }) => {
            processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED);
            if (newUser.email !== undefined && newUser.phoneNumber !== undefined) {
                // we do this check cause below when we call listUsersByAccountInfo,
                // we only pass in one of email or phone number
                throw new Error("Please pass one of email or phone number, not both");
            }
            return this.isSignInUpAllowedHelper({
                accountInfo: newUser,
                isVerified,
                session,
                tenantId,
                userContext,
                user: undefined,
                isSignIn: false,
            });
        };
        this.isSignInUpAllowedHelper = async ({
            accountInfo,
            isVerified,
            session,
            tenantId,
            isSignIn,
            user,
            userContext,
        }) => {
            processState_1.ProcessState.getInstance().addState(
                processState_1.PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED
            );
            // since this is a recipe level user, we have to do the following checks
            // before allowing sign in. We do these checks cause sign in also attempts
            // account linking:
            // - If there is no primary user for this user's account info, then
            // we check if any recipe user exist with the same info and it's not verified. If we
            // find one, we disallow signing in cause when this user becomes a primary user,
            // it may cause that other recipe user to be linked to this and if that recipe user
            // is owned by an attacker, it will lead to an account take over case
            // - If there exists another primary user, and if this user is not verified, we will
            // disallow cause if after sign in, this user sends an email verification email
            // to the email, then the primary user may click on it by mistake and get their account
            // taken over.
            // - If there exists another primary user, and that user's email is not verified,
            // then we disallow sign in cause that primary user may be owned by an attacker
            // and after this email is verified, it will link to that account causing account
            // takeover.
            // we find other accounts based on the email / phone number.
            // we do not pass in third party info, or both email or phone
            // cause we want to guarantee that the output array contains just one
            // primary user.
            let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: Object.assign(Object.assign({}, accountInfo), {
                    // we don't need to list by (webauthn) credentialId because we are looking for
                    // a user to link to the current recipe user, but any search using the credentialId
                    // of the current user "will identify the same user" which is the current one.
                    webauthn: undefined,
                }),
                doUnionOfAccountInfo: true,
                userContext,
            });
            if (users.length === 0) {
                (0, logger_1.logDebugMessage)(
                    "isSignInUpAllowedHelper returning true because no user with given account info"
                );
                // this is a brand new email / phone number, so we allow sign up.
                return true;
            }
            if (isSignIn && user === undefined) {
                throw new Error(
                    "This should never happen: isSignInUpAllowedHelper called with isSignIn: true, user: undefined"
                );
            }
            if (users.length === 1 && isSignIn && user !== undefined && users[0].id === user.id) {
                (0, logger_1.logDebugMessage)(
                    "isSignInUpAllowedHelper returning true because this is sign in and there is only a single user with the given account info"
                );
                return true;
            }
            // now we check if there exists some primary user with the same email / phone number
            // such that that info is not verified for that account. In this case, we do not allow
            // sign up cause we cannot link this new account to that primary account yet (since
            // the email / phone is unverified - this is to prevent an attack where an attacker
            // might have access to the unverified account's primary user and we do not want to
            // link this account to that one), and we can't make this a primary user either (since
            // then there would be two primary users with the same email / phone number - which is
            // not allowed..)
            const primaryUsers = users.filter((u) => u.isPrimaryUser);
            if (primaryUsers.length === 0) {
                (0, logger_1.logDebugMessage)("isSignInUpAllowedHelper no primary user exists");
                // since there is no primary user, it means that this user, if signed up, will end up
                // being the primary user. In this case, we check if any of the non primary user's
                // are in an unverified state having the same account info, and if they are, then we
                // disallow this sign up, cause if the user becomes the primary user, and then the other
                // account which is unverified sends an email verification email, the legit user might
                // click on the link and that account (which was unverified and could have been controlled
                // by an attacker), will end up getting linked to this account.
                let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                    accountInfo,
                    undefined,
                    session,
                    tenantId,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    (0, logger_1.logDebugMessage)(
                        "isSignInUpAllowedHelper returning true because account linking is disabled"
                    );
                    return true;
                }
                if (!shouldDoAccountLinking.shouldRequireVerification) {
                    (0, logger_1.logDebugMessage)(
                        "isSignInUpAllowedHelper returning true because dec does not require email verification"
                    );
                    // the dev says they do not care about verification before account linking
                    // so we are OK with the risk mentioned above.
                    return true;
                }
                let shouldAllow = true;
                for (let i = 0; i < users.length; i++) {
                    let currUser = users[i]; // all these are not primary users, so we can use
                    // loginMethods[0] to get the account info.
                    if (session !== undefined && currUser.id === session.getUserId(userContext)) {
                        // We do not consider the current session user to be conflicting
                        // This can be useful in cases where the current sign in will mark the session user as verified
                        continue;
                    }
                    let thisIterationIsVerified = false;
                    if (accountInfo.email !== undefined) {
                        if (
                            currUser.loginMethods[0].hasSameEmailAs(accountInfo.email) &&
                            currUser.loginMethods[0].verified
                        ) {
                            (0, logger_1.logDebugMessage)(
                                "isSignInUpAllowedHelper found same email for another user and verified"
                            );
                            thisIterationIsVerified = true;
                        }
                    }
                    if (accountInfo.phoneNumber !== undefined) {
                        if (
                            currUser.loginMethods[0].hasSamePhoneNumberAs(accountInfo.phoneNumber) &&
                            currUser.loginMethods[0].verified
                        ) {
                            (0, logger_1.logDebugMessage)(
                                "isSignInUpAllowedHelper found same phone number for another user and verified"
                            );
                            thisIterationIsVerified = true;
                        }
                    }
                    if (!thisIterationIsVerified) {
                        // even if one of the users is not verified, we do not allow sign up (see why above).
                        // Sure, this allows attackers to create email password accounts with an email
                        // to block actual users from signing up, but that's ok, since those
                        // users will just see an email already exists error and then will try another
                        // login method. They can also still just go through the password reset flow
                        // and then gain access to their email password account (which can then be verified).
                        (0, logger_1.logDebugMessage)(
                            "isSignInUpAllowedHelper returning false cause one of the other recipe level users is not verified"
                        );
                        shouldAllow = false;
                        break;
                    }
                }
                processState_1.ProcessState.getInstance().addState(
                    processState_1.PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                );
                (0, logger_1.logDebugMessage)("isSignInUpAllowedHelper returning " + shouldAllow);
                return shouldAllow;
            } else {
                if (primaryUsers.length > 1) {
                    throw new Error(
                        "You have found a bug. Please report to https://github.com/supertokens/supertokens-node/issues"
                    );
                }
                let primaryUser = primaryUsers[0];
                (0, logger_1.logDebugMessage)("isSignInUpAllowedHelper primary user found");
                let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                    accountInfo,
                    primaryUser,
                    session,
                    tenantId,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    (0, logger_1.logDebugMessage)(
                        "isSignInUpAllowedHelper returning true because account linking is disabled"
                    );
                    return true;
                }
                if (!shouldDoAccountLinking.shouldRequireVerification) {
                    (0, logger_1.logDebugMessage)(
                        "isSignInUpAllowedHelper returning true because dec does not require email verification"
                    );
                    // the dev says they do not care about verification before account linking
                    // so we can link this new user to the primary user post recipe user creation
                    // even if that user's email / phone number is not verified.
                    return true;
                }
                if (!isVerified) {
                    (0, logger_1.logDebugMessage)(
                        "isSignInUpAllowedHelper returning false because new user's email is not verified, and primary user with the same email was found."
                    );
                    // this will exist early with a false here cause it means that
                    // if we come here, the newUser will be linked to the primary user post email
                    // verification. Whilst this seems OK, there is a risk that the actual user might
                    // click on the email verification link thinking that they it's for their existing
                    // (legit) account, and then the attacker (who signed up with email password maybe)
                    // will have access to the account - cause email verification will cause account linking.
                    // We do this AFTER calling shouldDoAutomaticAccountLinking cause
                    // in case email verification is not required, then linking should not be
                    // an issue anyway.
                    return false;
                }
                // We do not consider the current session user to be conflicting
                // This can be useful in cases where the current sign in will mark the session user as verified
                if (session !== undefined && primaryUser.id === session.getUserId()) {
                    return true;
                }
                // we check for even if one is verified as opposed to all being unverified cause
                // even if one is verified, we know that the email / phone number is owned by the
                // primary account holder.
                // we only check this for primary user and not other users in the users array cause
                // they are all recipe users. The reason why we ignore them is cause, in normal
                // situations, they should not exist cause:
                // - if primary user was created first, then the recipe user creation would not
                // be allowed via unverified means of login method (like email password).
                // - if recipe user was created first, and is unverified, then the primary user
                // sign up should not be possible either.
                for (let i = 0; i < primaryUser.loginMethods.length; i++) {
                    let lM = primaryUser.loginMethods[i];
                    if (lM.email !== undefined) {
                        if (lM.hasSameEmailAs(accountInfo.email) && lM.verified) {
                            (0, logger_1.logDebugMessage)(
                                "isSignInUpAllowedHelper returning true cause found same email for primary user and verified"
                            );
                            return true;
                        }
                    }
                    if (lM.phoneNumber !== undefined) {
                        if (lM.hasSamePhoneNumberAs(accountInfo.phoneNumber) && lM.verified) {
                            (0, logger_1.logDebugMessage)(
                                "isSignInUpAllowedHelper returning true cause found same phone number for primary user and verified"
                            );
                            return true;
                        }
                    }
                }
                (0, logger_1.logDebugMessage)(
                    "isSignInUpAllowedHelper returning false cause primary user does not have the same email or phone number that is verified"
                    //"isSignInUpAllowedHelper returning false because new user's email is not verified, and primary user with the same email was found."
                );
                return false;
            }
        };
        this.isEmailChangeAllowed = async (input) => {
            /**
             * The purpose of this function is to check that if a recipe user ID's email
             * can be changed or not. There are two conditions for when it can't be changed:
             * - If the recipe user is a primary user, then we need to check that the new email
             * doesn't belong to any other primary user. If it does, we disallow the change
             * since multiple primary user's can't have the same account info.
             *
             * - If the recipe user is NOT a primary user, and if isVerified is false, then
             * we check if there exists a primary user with the same email, and if it does
             * we disallow the email change cause if this email is changed, and an email
             * verification email is sent, then the primary user may end up clicking
             * on the link by mistake, causing account linking to happen which can result
             * in account take over if this recipe user is malicious.
             */
            let inputUser = input.user;
            for (const tenantId of inputUser.tenantIds) {
                let existingUsersWithNewEmail = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                    tenantId,
                    accountInfo: {
                        email: input.newEmail,
                    },
                    doUnionOfAccountInfo: false,
                    userContext: input.userContext,
                });
                let otherUsersWithNewEmail = existingUsersWithNewEmail.filter((u) => u.id !== inputUser.id);
                let otherPrimaryUserForNewEmail = otherUsersWithNewEmail.filter((u) => u.isPrimaryUser);
                if (otherPrimaryUserForNewEmail.length > 1) {
                    throw new Error("You found a bug. Please report it on github.com/supertokens/supertokens-node");
                }
                if (inputUser.isPrimaryUser) {
                    // this is condition one from the above comment.
                    if (otherPrimaryUserForNewEmail.length !== 0) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: returning false cause email change will lead to two primary users having same email on ${tenantId}`
                        );
                        return { allowed: false, reason: "PRIMARY_USER_CONFLICT" };
                    }
                    if (input.isVerified) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is primary, new email is verified and doesn't belong to any other primary user`
                        );
                        continue;
                    }
                    if (inputUser.loginMethods.some((lm) => lm.hasSameEmailAs(input.newEmail) && lm.verified)) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is primary, new email is verified in another login method and doesn't belong to any other primary user`
                        );
                        continue;
                    }
                    if (otherUsersWithNewEmail.length === 0) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is primary and the new email doesn't belong to any other user (primary or non-primary)`
                        );
                        continue;
                    }
                    const shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                        otherUsersWithNewEmail[0].loginMethods[0],
                        inputUser,
                        input.session,
                        tenantId,
                        input.userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause linking is disabled`
                        );
                        continue;
                    }
                    if (!shouldDoAccountLinking.shouldRequireVerification) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause linking is doesn't require email verification`
                        );
                        continue;
                    }
                    (0, logger_1.logDebugMessage)(
                        `isEmailChangeAllowed: returning false because the user hasn't verified the new email address and there exists another user with it on ${tenantId} and linking requires verification`
                    );
                    return { allowed: false, reason: "ACCOUNT_TAKEOVER_RISK" };
                } else {
                    if (input.isVerified) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary and new email is verified`
                        );
                        continue;
                    }
                    if (inputUser.loginMethods[0].hasSameEmailAs(input.newEmail)) {
                        (0, logger_1.logDebugMessage)(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary and new email is same as the older one`
                        );
                        continue;
                    }
                    if (otherPrimaryUserForNewEmail.length === 1) {
                        let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                            inputUser.loginMethods[0],
                            otherPrimaryUserForNewEmail[0],
                            input.session,
                            tenantId,
                            input.userContext
                        );
                        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                            (0, logger_1.logDebugMessage)(
                                `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary there exists a primary user exists with the new email, but the dev does not have account linking enabled.`
                            );
                            continue;
                        }
                        if (!shouldDoAccountLinking.shouldRequireVerification) {
                            (0, logger_1.logDebugMessage)(
                                `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary there exists a primary user exists with the new email, but the dev does not require email verification.`
                            );
                            continue;
                        }
                        (0, logger_1.logDebugMessage)(
                            "isEmailChangeAllowed: returning false cause input user is not a primary there exists a primary user exists with the new email."
                        );
                        return { allowed: false, reason: "ACCOUNT_TAKEOVER_RISK" };
                    }
                    (0, logger_1.logDebugMessage)(
                        `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary no primary user exists with the new email`
                    );
                    continue;
                }
            }
            (0, logger_1.logDebugMessage)(
                "isEmailChangeAllowed: returning true cause email change can happen on all tenants the user is part of"
            );
            return { allowed: true };
        };
        this.verifyEmailForRecipeUserIfLinkedAccountsAreVerified = async (input) => {
            try {
                recipe_1.default.getInstanceOrThrowError();
            } catch (ignored) {
                // if email verification recipe is not initialized, we do a no-op
                return;
            }
            // This is just a helper function cause it's called in many places
            // like during sign up, sign in and post linking accounts.
            // This is not exposed to the developer as it's called in the relevant
            // recipe functions.
            // We do not do this in the core cause email verification is a different
            // recipe.
            // Finally, we only mark the email of this recipe user as verified and not
            // the other recipe users in the primary user (if this user's email is verified),
            // cause when those other users sign in, this function will be called for them anyway
            if (input.user.isPrimaryUser) {
                let recipeUserEmail = undefined;
                let isAlreadyVerified = false;
                input.user.loginMethods.forEach((lm) => {
                    if (lm.recipeUserId.getAsString() === input.recipeUserId.getAsString()) {
                        recipeUserEmail = lm.email;
                        isAlreadyVerified = lm.verified;
                    }
                });
                if (recipeUserEmail !== undefined) {
                    if (isAlreadyVerified) {
                        return;
                    }
                    let shouldVerifyEmail = false;
                    input.user.loginMethods.forEach((lm) => {
                        if (lm.hasSameEmailAs(recipeUserEmail) && lm.verified) {
                            shouldVerifyEmail = true;
                        }
                    });
                    if (shouldVerifyEmail) {
                        let resp = await recipe_1.default
                            .getInstanceOrThrowError()
                            .recipeInterfaceImpl.createEmailVerificationToken({
                                // While the token we create here is tenant specific, the verification status is not
                                // So we can use any tenantId the user is associated with here as long as we use the
                                // same in the verifyEmailUsingToken call
                                tenantId: input.user.tenantIds[0],
                                recipeUserId: input.recipeUserId,
                                email: recipeUserEmail,
                                userContext: input.userContext,
                            });
                        if (resp.status === "OK") {
                            // we purposely pass in false below cause we don't want account
                            // linking to happen
                            await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
                                // See comment about tenantId in the createEmailVerificationToken params
                                tenantId: input.user.tenantIds[0],
                                token: resp.token,
                                attemptAccountLinking: false,
                                userContext: input.userContext,
                            });
                        }
                    }
                }
            }
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    this.config,
                    this
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }
    static init(config) {
        return (appInfo, _isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    (0, plugins_1.applyPlugins)(
                        Recipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    ),
                    {},
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("AccountLinking recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    // we auto init the account linking recipe here cause we always require this
    // to be initialized even if the user has not initialized it.
    // The side effect of this is that if there are any APIs or errors specific to this recipe,
    // those won't be handled by the supertokens middleware and error handler (cause this recipe
    // is not in the recipeList).
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the AccountLinking.init function?");
    }
    getAPIsHandled() {
        // APIs won't be added to the supertokens middleware cause we are auto initializing
        // it in getInstance function
        return [];
    }
    handleAPIRequest(_id, _tenantId, _req, _response, _path, _method) {
        throw new Error("Should never come here");
    }
    handleError(error, _request, _response) {
        // Errors won't come here cause we are auto initializing
        // it in getInstance function
        throw error;
    }
    getAllCORSHeaders() {
        return [];
    }
    isErrorFromThisRecipe(err) {
        return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
    async shouldBecomePrimaryUser(user, tenantId, session, userContext) {
        const shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            user.loginMethods[0],
            undefined,
            session,
            tenantId,
            userContext
        );
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            (0, logger_1.logDebugMessage)(
                "shouldBecomePrimaryUser returning false because shouldAutomaticallyLink is false"
            );
            return false;
        }
        if (shouldDoAccountLinking.shouldRequireVerification && !user.loginMethods[0].verified) {
            (0, logger_1.logDebugMessage)(
                "shouldBecomePrimaryUser returning false because shouldRequireVerification is true but the login method is not verified"
            );
            return false;
        }
        (0, logger_1.logDebugMessage)("shouldBecomePrimaryUser returning true");
        return true;
    }
    async tryLinkingByAccountInfoOrCreatePrimaryUser({ inputUser, session, tenantId, userContext }) {
        let tries = 0;
        while (tries++ < 100) {
            const primaryUserThatCanBeLinkedToTheInputUser = await this.getPrimaryUserThatCanBeLinkedToRecipeUserId({
                user: inputUser,
                tenantId,
                userContext,
            });
            if (primaryUserThatCanBeLinkedToTheInputUser !== undefined) {
                (0, logger_1.logDebugMessage)(
                    "tryLinkingByAccountInfoOrCreatePrimaryUser: got primary user we can try linking"
                );
                // we check if the inputUser and primaryUserThatCanBeLinkedToTheInputUser are linked based on recipeIds because the inputUser obj could be outdated
                if (
                    !primaryUserThatCanBeLinkedToTheInputUser.loginMethods.some(
                        (lm) => lm.recipeUserId.getAsString() === inputUser.loginMethods[0].recipeUserId.getAsString()
                    )
                ) {
                    // If we got a primary user that can be linked to the input user and they are is not linked, we try to link them.
                    // The input user in this case cannot be linked to anything else, otherwise multiple primary users would have the same email
                    // we can use the 0 index cause targetUser is not a primary user.
                    let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                        inputUser.loginMethods[0],
                        primaryUserThatCanBeLinkedToTheInputUser,
                        session,
                        tenantId,
                        userContext
                    );
                    // We already checked if factor setup is allowed by this point, but maybe we should check again?
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser: not linking because shouldAutomaticallyLink is false"
                        );
                        return { status: "NO_LINK" };
                    }
                    const accountInfoVerifiedInPrimUser = primaryUserThatCanBeLinkedToTheInputUser.loginMethods.some(
                        (lm) =>
                            (inputUser.loginMethods[0].email !== undefined &&
                                lm.hasSameEmailAs(inputUser.loginMethods[0].email)) ||
                            (inputUser.loginMethods[0].phoneNumber !== undefined &&
                                lm.hasSamePhoneNumberAs(inputUser.loginMethods[0].phoneNumber) &&
                                lm.verified)
                    );
                    if (
                        shouldDoAccountLinking.shouldRequireVerification &&
                        (!inputUser.loginMethods[0].verified || !accountInfoVerifiedInPrimUser)
                    ) {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser: not linking because shouldRequireVerification is true but the login method is not verified in the new or the primary user"
                        );
                        return { status: "NO_LINK" };
                    }
                    (0, logger_1.logDebugMessage)("tryLinkingByAccountInfoOrCreatePrimaryUser linking");
                    let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
                        recipeUserId: inputUser.loginMethods[0].recipeUserId,
                        primaryUserId: primaryUserThatCanBeLinkedToTheInputUser.id,
                        userContext,
                    });
                    if (linkAccountsResult.status === "OK") {
                        (0, logger_1.logDebugMessage)("tryLinkingByAccountInfoOrCreatePrimaryUser successfully linked");
                        return { status: "OK", user: linkAccountsResult.user };
                    } else if (
                        linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        // this can happen cause of a race condition wherein the recipe user ID get's linked to
                        // some other primary user whilst this function is running.
                        // We can return this directly, because:
                        // 1. a retry would result in the same
                        // 2. the tryLinkingByAccountInfoOrCreatePrimaryUser doesn't specify where it should be linked
                        //    and we can't linked it to anything here after it became primary/linked to another primary user
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser already linked to another user"
                        );
                        return {
                            status: "OK",
                            user: linkAccountsResult.user,
                        };
                    } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser linking failed because of a race condition"
                        );
                        // this can be possible during a race condition wherein the primary user
                        // that we fetched somehow is no more a primary user. This can happen if
                        // the unlink function was called in parallel on that user. So we can just retry
                        continue;
                    } else {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser linking failed because of a race condition"
                        );
                        // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        // it can come here if the recipe user ID can't be linked to the primary user ID cause
                        // the email / phone number is associated with some other primary user ID.
                        // This can happen due to a race condition in which the email has changed
                        // from one primary user to another during this function call.
                        // In this case we can retry, since the next time we fetch the primary user we can link to
                        // it'll point to the correct user.
                        continue;
                    }
                }
                // If they are already linked, this is a no-op
                return { status: "OK", user: inputUser };
            }
            // If there is no primary user we could link to, but we there is another account we can link this to
            // then we try and link it (respecting shouldDoAutomaticAccountLinking)
            const oldestUserThatCanBeLinkedToTheInputUser = await this.getOldestUserThatCanBeLinkedToRecipeUser({
                user: inputUser,
                tenantId,
                userContext,
            });
            if (
                oldestUserThatCanBeLinkedToTheInputUser !== undefined &&
                oldestUserThatCanBeLinkedToTheInputUser.id !== inputUser.id
            ) {
                (0, logger_1.logDebugMessage)(
                    "tryLinkingByAccountInfoOrCreatePrimaryUser: got an older user we can try linking"
                );
                // We know that the older user isn't primary, otherwise we'd hit the branch above.
                let shouldMakeOlderUserPrimary = await this.shouldBecomePrimaryUser(
                    oldestUserThatCanBeLinkedToTheInputUser,
                    tenantId,
                    session,
                    userContext
                );
                // if the app doesn't want to make the older user primary, we can't link to it
                // so we fall back to trying the newer user primary (and not linking)
                if (shouldMakeOlderUserPrimary) {
                    const createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: oldestUserThatCanBeLinkedToTheInputUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                    if (
                        createPrimaryUserResult.status ===
                            "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                        createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                    ) {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser: retrying because createPrimaryUser returned " +
                                createPrimaryUserResult.status
                        );
                        continue;
                    }
                    // If we got a primary user that can be linked to the input user and they are is not linked, we try to link them.
                    // The input user in this case cannot be linked to anything else, otherwise multiple primary users would have the same email
                    // we can use the 0 index cause targetUser is not a primary user.
                    let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                        inputUser.loginMethods[0],
                        createPrimaryUserResult.user,
                        session,
                        tenantId,
                        userContext
                    );
                    // We already checked if factor setup is allowed by this point, but maybe we should check again?
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser: not linking because shouldAutomaticallyLink is false"
                        );
                        return { status: "NO_LINK" };
                    }
                    if (shouldDoAccountLinking.shouldRequireVerification && !inputUser.loginMethods[0].verified) {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser: not linking because shouldRequireVerification is true but the login method is not verified"
                        );
                        return { status: "NO_LINK" };
                    }
                    (0, logger_1.logDebugMessage)("tryLinkingByAccountInfoOrCreatePrimaryUser linking");
                    let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
                        recipeUserId: inputUser.loginMethods[0].recipeUserId,
                        primaryUserId: createPrimaryUserResult.user.id,
                        userContext,
                    });
                    if (linkAccountsResult.status === "OK") {
                        (0, logger_1.logDebugMessage)("tryLinkingByAccountInfoOrCreatePrimaryUser successfully linked");
                        return { status: "OK", user: linkAccountsResult.user };
                    } else if (
                        linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        // this can happen cause of a race condition wherein the recipe user ID get's linked to
                        // some other primary user whilst this function is running.
                        // We can return this directly, because:
                        // 1. a retry would result in the same
                        // 2. the tryLinkingByAccountInfoOrCreatePrimaryUser doesn't specify where it should be linked
                        //    and we can't linked it to anything here after it became primary/linked to another primary user
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser already linked to another user"
                        );
                        return {
                            status: "OK",
                            user: linkAccountsResult.user,
                        };
                    } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser linking failed because of a race condition"
                        );
                        // this can be possible during a race condition wherein the primary user
                        // that we fetched somehow is no more a primary user. This can happen if
                        // the unlink function was called in parallel on that user. So we can just retry
                        continue;
                    } else {
                        (0, logger_1.logDebugMessage)(
                            "tryLinkingByAccountInfoOrCreatePrimaryUser linking failed because of a race condition"
                        );
                        // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        // it can come here if the recipe user ID can't be linked to the primary user ID cause
                        // the email / phone number is associated with some other primary user ID.
                        // This can happen due to a race condition in which the email has changed
                        // from one primary user to another during this function call.
                        // In this case we can retry, since the next time we fetch the primary user we can link to
                        // it'll point to the correct user.
                        continue;
                    }
                }
            }
            (0, logger_1.logDebugMessage)(
                "tryLinkingByAccountInfoOrCreatePrimaryUser: trying to make the current user primary"
            );
            // In this case we have no other account we can link to, so we check if the current user should become a primary user
            if (await this.shouldBecomePrimaryUser(inputUser, tenantId, session, userContext)) {
                let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId: inputUser.loginMethods[0].recipeUserId,
                    userContext,
                });
                // If the status is "OK", we can return it directly (it contains the updated user)
                // if the status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" or "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                // meaning that the recipe user ID is already linked to another primary  user id (race condition), or that some other
                // primary user ID exists with the same email / phone number (again, race condition).
                // In this case we call a retry in createPrimaryUserIdOrLinkByAccountInfo
                if (
                    createPrimaryUserResult.status ===
                        "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                    createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                ) {
                    continue;
                }
                return createPrimaryUserResult;
            } else {
                // If not we return it unchanged
                return { status: "OK", user: inputUser };
            }
        }
        throw new Error("This should never happen: ran out of retries for tryLinkingByAccountInfoOrCreatePrimaryUser");
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "accountlinking";
exports.default = Recipe;
