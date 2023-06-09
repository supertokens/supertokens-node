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
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const querier_1 = require("../../querier");
const error_1 = __importDefault(require("../../error"));
const error_2 = __importDefault(require("../session/error"));
const supertokens_1 = __importDefault(require("../../supertokens"));
const processState_1 = require("../../processState");
const logger_1 = require("../../logger");
const mockCore_1 = require("./mockCore");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        // this function returns the user ID for which the session will be created.
        this.createPrimaryUserIdOrLinkAccounts = ({ recipeUserId, checkAccountsToLinkTableAsWell, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let recipeUser = yield this.recipeInterfaceImpl.getUser({
                    userId: recipeUserId.getAsString(),
                    userContext,
                });
                if (recipeUser === undefined) {
                    // This can come here if the user is using session + email verification
                    // recipe with a user ID that is not known to supertokens. In this case,
                    // we do not allow linking for such users.
                    return recipeUserId.getAsString();
                }
                if (recipeUser.isPrimaryUser) {
                    return recipeUser.id;
                }
                let loginMethod = undefined;
                for (let i = 0; i < recipeUser.loginMethods.length; i++) {
                    if (recipeUser.loginMethods[i].recipeUserId.getAsString() === recipeUserId.getAsString()) {
                        loginMethod = recipeUser.loginMethods[i];
                        break;
                    }
                }
                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                // now we try and find a linking candidate.
                let primaryUser = yield this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                    recipeUserId,
                    checkAccountsToLinkTableAsWell,
                    userContext,
                });
                if (primaryUser === undefined) {
                    // this means that this can become a primary user.
                    // we can use the 0 index cause this user is
                    // not a primary user.
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        recipeUser.loginMethods[0],
                        undefined,
                        undefined,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        return recipeUserId.getAsString();
                    }
                    if (shouldDoAccountLinking.shouldRequireVerification && !loginMethod.verified) {
                        return recipeUserId.getAsString();
                    }
                    let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: recipeUserId,
                        userContext,
                    });
                    if (createPrimaryUserResult.status === "OK") {
                        return createPrimaryUserResult.user.id;
                    }
                    // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" or "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                    // if it comes here, it means that the recipe
                    // user ID is already linked to another primary
                    // user id (race condition), or that some other
                    // primary user ID exists with the same email / phone number (again, race condition).
                    // So we do recursion here to try again.
                    return yield this.createPrimaryUserIdOrLinkAccounts({
                        recipeUserId,
                        checkAccountsToLinkTableAsWell,
                        userContext,
                    });
                } else {
                    // this means that we found a primary user ID which can be linked to this recipe user ID. So we try and link them.
                    // we can use the 0 index cause this user is
                    // not a primary user.
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        recipeUser.loginMethods[0],
                        primaryUser,
                        undefined,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        return recipeUserId.getAsString();
                    }
                    if (shouldDoAccountLinking.shouldRequireVerification && !loginMethod.verified) {
                        return recipeUserId.getAsString();
                    }
                    let linkAccountsResult = yield this.recipeInterfaceImpl.linkAccounts({
                        recipeUserId: recipeUserId,
                        primaryUserId: primaryUser.id,
                        userContext,
                    });
                    if (linkAccountsResult.status === "OK") {
                        return primaryUser.id;
                    } else if (
                        linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        // this can happen cause of a race condition
                        // wherein the recipe user ID get's linked to
                        // some other primary user whilst this function is running.
                        // But this is OK cause we just care about
                        // returning the user ID of the linked user
                        // which the result has.
                        return linkAccountsResult.primaryUserId;
                    } else {
                        // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        // it can come here if the recipe user ID
                        // can't be linked to the primary user ID cause
                        // the email / phone number is associated with some other primary user ID.
                        // This can happen due to a race condition in which
                        // the email has changed from one primary user to another during this function call,
                        // or it can happen if the accounts to link table
                        // contains a user which this is supposed to
                        // be linked to, but we can't link it cause during the time the user was added to that table and now, some other primary user has
                        // got this email.
                        // So we try again, but without caring about
                        // the accounts to link table (cause they we will end up in an infinite recursion).
                        return yield this.createPrimaryUserIdOrLinkAccounts({
                            recipeUserId,
                            checkAccountsToLinkTableAsWell: false,
                            userContext,
                        });
                    }
                }
            });
        this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = ({
            recipeUserId,
            checkAccountsToLinkTableAsWell,
            userContext,
        }) =>
            __awaiter(this, void 0, void 0, function* () {
                // first we check if this user itself is a
                // primary user or not. If it is, we return that.
                let user = yield this.recipeInterfaceImpl.getUser({ userId: recipeUserId.getAsString(), userContext });
                if (user === undefined) {
                    return undefined;
                }
                if (user.isPrimaryUser) {
                    return user;
                }
                // then we check the accounts to link table. This
                // table can have an entry if this user was trying
                // to be linked to another user post sign in but required
                // email verification.
                if (checkAccountsToLinkTableAsWell) {
                    let pUserId = yield this.recipeInterfaceImpl.fetchFromAccountToLinkTable({
                        recipeUserId,
                        userContext,
                    });
                    if (pUserId !== undefined) {
                        let pUser = yield this.recipeInterfaceImpl.getUser({ userId: pUserId, userContext });
                        if (pUser !== undefined && pUser.isPrimaryUser) {
                            return pUser;
                        }
                    }
                }
                // finally, we try and find a primary user based on
                // the email / phone number / third party ID.
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: user.loginMethods[0],
                    doUnionOfAccountInfo: true,
                    userContext,
                });
                let pUsers = users.filter((u) => u.isPrimaryUser);
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
                    return undefined;
                }
                return pUsers.length === 0 ? undefined : pUsers[0];
            });
        this.isSignUpAllowed = ({ newUser, isVerified, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                if (
                    newUser.recipeId === "passwordless" &&
                    newUser.email !== undefined &&
                    newUser.phoneNumber !== undefined
                ) {
                    throw new Error("Please use exactly one of email or phone number to sign up, and not both.");
                }
                // we find other accounts based on the email / phone number.
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: newUser,
                    doUnionOfAccountInfo: true,
                    // are enforcing above that newUser just has one identifying info
                    userContext,
                });
                if (users.length === 0) {
                    logger_1.logDebugMessage("isSignUpAllowed returning true because no user with given account info");
                    // this is a brand new email / phone number, so we allow sign up.
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
                const primaryUser = users.find((u) => u.isPrimaryUser);
                if (primaryUser === undefined) {
                    logger_1.logDebugMessage("isSignUpAllowed no primary user exists");
                    // since there is no primary user, it means that this user, if signed up, will end up
                    // being the primary user. In this case, we check if any of the non primary user's
                    // are in an unverified state having the same account info, and if they are, then we
                    // disallow this sign up, cause if the user becomes the primary user, and then the other
                    // account which is unverified sends an email verification email, the legit user might
                    // click on the link and that account (which was unverified and could have been controlled
                    // by an attacker), will end up getting linked to this account.
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        newUser,
                        undefined,
                        undefined,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        logger_1.logDebugMessage("isSignUpAllowed returning true because account linking is disabled");
                        return true;
                    }
                    if (!shouldDoAccountLinking.shouldRequireVerification) {
                        logger_1.logDebugMessage(
                            "isSignUpAllowed returning true because dec does not require email verification"
                        );
                        // the dev says they do not care about verification before account linking
                        // so we are OK with the risk mentioned above.
                        return true;
                    }
                    let shouldAllow = true;
                    for (let i = 0; i < users.length; i++) {
                        let currUser = users[i]; // all these are not primary users, so we can use
                        // loginMethods[0] to get the account info.
                        let thisIterationIsVerified = false;
                        if (newUser.email !== undefined) {
                            if (
                                currUser.loginMethods[0].hasSameEmailAs(newUser.email) &&
                                currUser.loginMethods[0].verified
                            ) {
                                logger_1.logDebugMessage(
                                    "isSignUpAllowed found same email for another user and verified"
                                );
                                thisIterationIsVerified = true;
                            }
                        }
                        if (newUser.phoneNumber !== undefined) {
                            if (
                                currUser.loginMethods[0].hasSamePhoneNumberAs(newUser.phoneNumber) &&
                                currUser.loginMethods[0].verified
                            ) {
                                logger_1.logDebugMessage(
                                    "isSignUpAllowed found same phone number for another user and verified"
                                );
                                thisIterationIsVerified = true;
                            }
                        }
                        if (!thisIterationIsVerified) {
                            // even if one of the users is not verified, we do not allow sign up.
                            // sure allows attackers to create email password accounts with an email
                            // to block actual users from signing up, but that's ok, since those
                            // users will just see an email already exists error and then will try another
                            // login method. They can also still just go through the password reset flow
                            // and then gain access to their email password account (which can then be verified).
                            logger_1.logDebugMessage(
                                "isSignUpAllowed returning false cause one of the other recipe level users is not verified"
                            );
                            shouldAllow = false;
                            break;
                        }
                    }
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE.IS_SIGN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                    );
                    logger_1.logDebugMessage("isSignUpAllowed returning " + shouldAllow);
                    return shouldAllow;
                } else {
                    logger_1.logDebugMessage("isSignUpAllowed primary user found");
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        newUser,
                        primaryUser,
                        undefined,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        logger_1.logDebugMessage("isSignUpAllowed returning true because account linking is disabled");
                        return true;
                    }
                    if (!shouldDoAccountLinking.shouldRequireVerification) {
                        logger_1.logDebugMessage(
                            "isSignUpAllowed returning true because dec does not require email verification"
                        );
                        // the dev says they do not care about verification before account linking
                        // so we can link this new user to the primary user post recipe user creation
                        // even if that user's email / phone number is not verified.
                        return true;
                    }
                    if (!isVerified) {
                        logger_1.logDebugMessage(
                            "isSignUpAllowed returning false because new user's email is not verified, and primary user with the same email was found."
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
                            if (lM.hasSameEmailAs(newUser.email) && lM.verified) {
                                logger_1.logDebugMessage(
                                    "isSignUpAllowed returning true cause found same email for primary user and verified"
                                );
                                return true;
                            }
                        }
                        if (lM.phoneNumber !== undefined) {
                            if (lM.hasSamePhoneNumberAs(newUser.phoneNumber) && lM.verified) {
                                logger_1.logDebugMessage(
                                    "isSignUpAllowed returning true cause found same phone number for primary user and verified"
                                );
                                return true;
                            }
                        }
                    }
                    logger_1.logDebugMessage(
                        "isSignUpAllowed returning false cause primary user does not have the same email or phone number that is verified"
                    );
                    return false;
                }
            });
        this.linkAccountWithUserFromSession = ({
            session,
            newUser,
            createRecipeUserFunc,
            verifyCredentialsFunc,
            userContext,
        }) =>
            __awaiter(this, void 0, void 0, function* () {
                // In order to link the newUser to the session user,
                // we need to first make sure that the session user
                // is a primary user (or make them one if they are not).
                let existingUser = yield this.recipeInterfaceImpl.getUser({
                    userId: session.getUserId(),
                    userContext,
                });
                if (existingUser === undefined) {
                    // this can come here if the user ID in the session belongs to a user
                    // that is not recognized by SuperTokens. In this case, we
                    // simply return the session user ID
                    return {
                        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        description:
                            "Accounts cannot be linked because the session belongs to a user ID that does not exist in SuperTokens.",
                    };
                }
                if (!existingUser.isPrimaryUser) {
                    // we will try and make the existing user a primary user. But before that, we must ask
                    // the dev if they want to allow for that.
                    // here we can use the index of 0 cause the existingUser is not a primary user,
                    // therefore it will only have one login method in the loginMethods' array.
                    const shouldDoAccountLinkingOfExistingUser = yield this.config.shouldDoAutomaticAccountLinking(
                        existingUser.loginMethods[0],
                        undefined,
                        session,
                        userContext
                    );
                    if (!shouldDoAccountLinkingOfExistingUser.shouldAutomaticallyLink) {
                        return {
                            status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                            description: "Account linking not allowed by the developer for existing user.",
                        };
                    }
                    if (
                        shouldDoAccountLinkingOfExistingUser.shouldRequireVerification &&
                        !existingUser.loginMethods[0].verified
                    ) {
                        // We do not allow creation of primary user
                        // if the existing user is not verified
                        // cause if we do, then it blocks sign up
                        // with other methods for the same email / phone number
                        // until this account is verified. This can be
                        // used by an attacker to prevent sign up from
                        // their victim by setting the account
                        // in this state and not verifying the account.
                        // The downside to this is that cause of this,
                        // in situations like MFA, we are forcing
                        // email verification to happen right after the user
                        // has finished setting up the second factor.
                        // This may not be something that the developer
                        // wants. But they can always switch this off
                        // by providing the right impl for shouldDoAutomaticAccountLinking
                        // this is equivalent to throwing the email verification claim error
                        throw new error_2.default({
                            type: error_2.default.INVALID_CLAIMS,
                            payload: [
                                {
                                    id: "st-ev",
                                    reason: { message: "wrong value", expectedValue: true, actualValue: false },
                                },
                            ],
                            message: "INVALID_CLAIMS",
                        });
                    }
                    // now we can try and create a primary user for the existing user
                    let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: existingUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                    if (createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        // this can happen if there is a race condition in which the
                        // existing user becomes a primary user ID by the time the code
                        // execution comes into this block. So we call the function once again.
                        return yield this.linkAccountWithUserFromSession({
                            session,
                            newUser,
                            createRecipeUserFunc,
                            verifyCredentialsFunc,
                            userContext,
                        });
                    } else if (
                        createPrimaryUserResult.status ===
                        "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        /* this can come here if in the following example:
                    - User creates a primary account (P1) using email R
                    - User2 created another account (A2) with email R (but this is not yet linked to P1 cause maybe A2 is not a candidate for account linking)
                    - Now User2 is logged in with A2 account, and they are trying to link with another account.
                    - In this case, existingUser (A2 account), cannot become a primary user
                    - So we are in a stuck state, and must ask the end user to contact support*/
                        return {
                            status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                            description:
                                "No account can be linked to the session account cause the session account is not a primary account and the account info is already associated with another primary account, so we cannot make this a primary account either. Please contact support.",
                        };
                    } else if (createPrimaryUserResult.status === "OK") {
                        // this if condition is not needed, but for some reason TS complains if it's not there.
                        existingUser = createPrimaryUserResult.user;
                    }
                    // at this point, the existingUser is a primary user. So we can
                    // go ahead and attempt account linking for the new user and existingUser.
                }
                // before proceeding to link the two accounts, we must ask the dev if it's allowed to link them
                const shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    newUser,
                    existingUser,
                    session,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    return {
                        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        description: "Account linking not allowed by the developer for new account.",
                    };
                }
                // in order to link accounts, we need to have the recipe user ID of the new account.
                let usersArrayThatHaveSameAccountInfoAsNewUser = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: newUser,
                    doUnionOfAccountInfo: true,
                    // before and have email and phone number (in case of passwordless for example)
                    userContext,
                });
                const userObjThatHasSameAccountInfoAndRecipeIdAsNewUser = usersArrayThatHaveSameAccountInfoAsNewUser.find(
                    (u) =>
                        u.loginMethods.find((lU) => {
                            if (lU.recipeId !== newUser.recipeId) {
                                return false;
                            }
                            if (newUser.recipeId === "thirdparty") {
                                return lU.hasSameThirdPartyInfoAs(newUser.thirdParty);
                            } else {
                                return lU.hasSameEmailAs(newUser.email) || lU.hasSamePhoneNumberAs(newUser.phoneNumber);
                            }
                        }) !== undefined
                );
                if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser === undefined) {
                    /*
                Before proceeding to linking accounts, we need to create the recipe user ID associated
                with newUser. In order to do that we should check if there is some other primary user
                has the same account info - cause if there is, then linking to this existingUser will not
                be possible anyway, so we don't create a new recipe user cause if we did, then this
                recipe user will not be a candidate for automatic account linking in the future
                */
                    let otherPrimaryUsers = usersArrayThatHaveSameAccountInfoAsNewUser.filter((u) => u.isPrimaryUser);
                    for (let i = 0; i < otherPrimaryUsers.length; i++) {
                        if (otherPrimaryUsers[i].id !== existingUser.id) {
                            return {
                                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                                description:
                                    "Not allowed because it will lead to two primary user id having same account info.",
                            };
                        }
                    }
                    // we create the new recipe user
                    yield createRecipeUserFunc(userContext);
                    // now when we recurse, the new recipe user will be found and we can try linking again.
                    return yield this.linkAccountWithUserFromSession({
                        session,
                        newUser,
                        createRecipeUserFunc,
                        verifyCredentialsFunc,
                        userContext,
                    });
                } else {
                    // since the user already exists, we should first verify the credentials
                    // before continuing to link the accounts.
                    let verifyResult = yield verifyCredentialsFunc(userContext);
                    if (verifyResult.status === "CUSTOM_RESPONSE") {
                        return verifyResult;
                    }
                    // this means that the verification was fine and we can continue..
                }
                // we check if the userObjThatHasSameAccountInfoAndRecipeIdAsNewUser is
                // a primary user or not, and if it is, then it means that our newUser
                // is already linked so we can return early.
                // we do this even though it will be checked later during linkAccounts function
                // call cause we do not want to do the email verification check that's below this block,
                // in case this block errors out so that we do not make the user go through the email
                // verification flow unnecessarily.
                if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.isPrimaryUser) {
                    if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id === existingUser.id) {
                        // this means that the accounts we want to link are already linked.
                        return {
                            status: "OK",
                            wereAccountsAlreadyLinked: true,
                        };
                    } else {
                        return {
                            status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                            description: "New user is already linked to another account or is a primary user.",
                        };
                    }
                }
                // now we check about the email verification of the new user. If it's verified, we proceed
                // to try and link the accounts, and if not, we send email verification error ONLY if the email
                // or phone number of the new account is different compared to the existing account.
                if (usersArrayThatHaveSameAccountInfoAsNewUser.find((u) => u.id === existingUser.id) === undefined) {
                    // this means that the existing user does not share anything in common with the new user
                    // in terms of account info. So we check for email verification status..
                    if (
                        !userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].verified &&
                        shouldDoAccountLinking.shouldRequireVerification
                    ) {
                        // we stop the flow and ask the user to verify this email first.
                        // the recipe ID is the userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id
                        // cause above we checked that userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.isPrimaryUser is false.
                        return {
                            status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                            primaryUserId: existingUser.id,
                            recipeUserId:
                                userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].recipeUserId,
                        };
                    }
                }
                const linkAccountResponse = yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].recipeUserId,
                    primaryUserId: existingUser.id,
                    userContext,
                });
                if (linkAccountResponse.status === "OK") {
                    return {
                        status: "OK",
                        wereAccountsAlreadyLinked: linkAccountResponse.accountsAlreadyLinked,
                    };
                } else if (
                    linkAccountResponse.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
                    // this means that the the new user is already linked to some other primary user ID,
                    // so we can't link it to the existing user.
                    return {
                        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        description: "New user is already linked to another account or is a primary user.",
                    };
                } else {
                    // status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    // this means that the account info of the newUser already belongs to some other primary user ID.
                    // So we cannot link it to existing user.
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE
                            .ACCOUNT_LINKING_NOT_ALLOWED_ERROR_END_OF_linkAccountWithUserFromSession_FUNCTION
                    );
                    return {
                        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        description:
                            "Not allowed because it will lead to two primary user id having same account info.",
                    };
                }
            });
        this.config = utils_1.validateAndNormaliseUserInput(appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }
    static init(config) {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    config,
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
    static getInstance() {
        if (Recipe.instance === undefined) {
            Recipe.init()(
                supertokens_1.default.getInstanceOrThrowError().appInfo,
                supertokens_1.default.getInstanceOrThrowError().isInServerlessEnv
            );
        }
        return Recipe.instance;
    }
    getAPIsHandled() {
        // APIs won't be added to the supertokens middleware cause we are auto initializing
        // it in getInstance function
        return [];
    }
    handleAPIRequest(_id, _req, _response, _path, _method) {
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
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
        mockCore_1.mockReset();
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "accountlinking";
