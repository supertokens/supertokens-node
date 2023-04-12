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
const __1 = require("../..");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const querier_1 = require("../../querier");
const error_1 = __importDefault(require("../../error"));
const recipe_1 = __importDefault(require("../emailverification/recipe"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.transformUserInfoIntoVerifiedAndUnverifiedBucket = (user) => {
            let identities = {
                verified: {
                    emails: [],
                    phoneNumbers: [],
                    thirdParty: [],
                },
                unverified: {
                    emails: [],
                    phoneNumbers: [],
                    thirdParty: [],
                },
            };
            for (let i = 0; i < user.loginMethods.length; i++) {
                let loginMethod = user.loginMethods[i];
                if (loginMethod.email !== undefined) {
                    if (loginMethod.verified) {
                        identities.verified.emails.push(loginMethod.email);
                    } else {
                        identities.unverified.emails.push(loginMethod.email);
                    }
                }
                if (loginMethod.phoneNumber !== undefined) {
                    if (loginMethod.verified) {
                        identities.verified.phoneNumbers.push(loginMethod.phoneNumber);
                    } else {
                        identities.unverified.phoneNumbers.push(loginMethod.phoneNumber);
                    }
                }
                if (loginMethod.thirdParty !== undefined) {
                    if (loginMethod.verified) {
                        identities.verified.thirdParty.push(loginMethod.thirdParty);
                    } else {
                        identities.unverified.thirdParty.push(loginMethod.thirdParty);
                    }
                }
            }
            // we remove duplicate emails / phone numbers from the above arrays.
            identities.verified.emails = Array.from(new Set(identities.verified.emails));
            identities.unverified.emails = Array.from(new Set(identities.unverified.emails));
            identities.verified.phoneNumbers = Array.from(new Set(identities.verified.phoneNumbers));
            identities.unverified.phoneNumbers = Array.from(new Set(identities.unverified.phoneNumbers));
            // Note that we do not need to filter out thirdParty info based on uniqueness, cause
            // one user can only have one unique thirdPart login.
            return identities;
        };
        this.isSignUpAllowed = ({ newUser, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let accountInfo;
                if (newUser.email !== undefined) {
                    accountInfo = {
                        email: newUser.email,
                    };
                } else if (newUser.phoneNumber !== undefined) {
                    accountInfo = {
                        phoneNumber: newUser.phoneNumber,
                    };
                } else if (newUser.thirdParty !== undefined) {
                    accountInfo = {
                        thirdPartyId: newUser.thirdParty.id,
                        thirdPartyUserId: newUser.thirdParty.userId,
                    };
                } else {
                    // It's not possible to come here because all the login methods are covered above.
                    throw new Error("Should never come here");
                }
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo,
                    userContext,
                });
                if (users.length === 0) {
                    return true;
                }
                /**
                 * For a given email/phoneNumber, there can only exists
                 * one primary user at max
                 */
                let primaryUser = users.find((u) => u.isPrimaryUser);
                if (primaryUser === undefined) {
                    return true;
                }
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    newUser,
                    primaryUser,
                    undefined,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    return true;
                }
                if (!shouldDoAccountLinking.shouldRequireVerification) {
                    return true;
                }
                let identitiesForPrimaryUser = this.transformUserInfoIntoVerifiedAndUnverifiedBucket(primaryUser);
                if (newUser.email !== undefined) {
                    return identitiesForPrimaryUser.verified.emails.includes(newUser.email);
                }
                if (newUser.phoneNumber !== undefined) {
                    return identitiesForPrimaryUser.verified.phoneNumbers.includes(newUser.phoneNumber);
                }
                return false;
            });
        this.markEmailAsVerified = ({ email, recipeUserId, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                const emailVerificationInstance = recipe_1.default.getInstance();
                if (emailVerificationInstance !== undefined) {
                    const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            userId: recipeUserId,
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
        // this function returns the user ID for which the session will be created.
        this.doPostSignUpAccountLinkingOperations = ({ newUser, newUserVerified, recipeUserId, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                    recipeUserId,
                    userContext,
                });
                if (user === undefined) {
                    return recipeUserId;
                }
                let primaryUser = user;
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    newUser,
                    primaryUser,
                    undefined,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    return recipeUserId;
                }
                if (shouldDoAccountLinking.shouldRequireVerification && !newUserVerified) {
                    return recipeUserId;
                }
                let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId,
                    userContext,
                });
                if (createPrimaryUserResult.status === "OK") {
                    return createPrimaryUserResult.user.id;
                }
                if (
                    createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR" &&
                    createPrimaryUserResult.primaryUserId === recipeUserId
                ) {
                    return createPrimaryUserResult.primaryUserId;
                }
                // if it comes here, it means that that there is already a primary user for the
                // account info, or that this recipeUserId is already linked. Either way, we proceed
                // to the next step, cause that takes care of both these cases.
                if (primaryUser === undefined) {
                    // it can come here if there is a race condition. So we just try again
                    return yield this.doPostSignUpAccountLinkingOperations({
                        newUser: newUser,
                        newUserVerified: newUserVerified,
                        recipeUserId,
                        userContext,
                    });
                }
                let result = yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId,
                    primaryUserId: primaryUser.id,
                    userContext,
                });
                if (result.status === "OK") {
                    return primaryUser.id;
                } else if (result.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                    return result.primaryUserId;
                } else if (result.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                    return result.primaryUserId;
                } else {
                    return primaryUser.id;
                }
            });
        this.accountLinkPostSignInViaSession = ({ session, newUser, newUserVerified, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let userId = session.getUserId();
                let existingUser = yield this.recipeInterfaceImpl.getUser({
                    userId,
                    userContext,
                });
                if (existingUser === undefined) {
                    // this can come here if the user ID in the session belongs to a user
                    // that is not recognized by SuperTokens. In this case, we
                    // disallow this kind of operation.
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                    };
                }
                /**
                 * checking if the user with existing session
                 * is a primary user or not
                 */
                if (!existingUser.isPrimaryUser) {
                    // first we check if the newUser should be a candidate for account linking
                    const shouldDoAccountLinkingOfNewUser = yield this.config.shouldDoAutomaticAccountLinking(
                        newUser,
                        undefined,
                        session,
                        userContext
                    );
                    if (!shouldDoAccountLinkingOfNewUser.shouldAutomaticallyLink) {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        };
                    }
                    // Now we ask the user if the existing login method can be linked to anything
                    // (since it's not a primary user)
                    // here we can use the index of 0 cause the existingUser is not a primary user,
                    // therefore it will only have one login method in the loginMethods' array.
                    let existingUserAccountInfoAndEmailWithRecipeId = {
                        recipeId: existingUser.loginMethods[0].recipeId,
                        email: existingUser.loginMethods[0].email,
                        phoneNumber: existingUser.loginMethods[0].phoneNumber,
                        thirdParty: existingUser.loginMethods[0].thirdParty,
                    };
                    const shouldDoAccountLinkingOfExistingUser = yield this.config.shouldDoAutomaticAccountLinking(
                        existingUserAccountInfoAndEmailWithRecipeId,
                        undefined,
                        session,
                        userContext
                    );
                    if (!shouldDoAccountLinkingOfExistingUser.shouldAutomaticallyLink) {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        };
                    }
                    if (
                        shouldDoAccountLinkingOfExistingUser.shouldRequireVerification &&
                        !existingUser.loginMethods[0].verified
                    ) {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                        };
                    }
                    let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: existingUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                    if (createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        // this can happen if there is a race condition in which the
                        // existing user becomes a primary user ID by the time the code
                        // execution comes into this block. So we call the function once again.
                        return yield this.accountLinkPostSignInViaSession({
                            session,
                            newUser,
                            newUserVerified,
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
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: createPrimaryUserResult.status,
                            primaryUserId: createPrimaryUserResult.primaryUserId,
                        };
                    } else if (createPrimaryUserResult.status === "OK") {
                        // this if condition is not needed, but for some reason TS complains if it's not there.
                        existingUser = createPrimaryUserResult.user;
                    }
                    // at this point, the existingUser is a primary user. So we can
                    // go ahead and attempt account linking for the new user and existingUser.
                }
                /**
                 * checking if account linking is allowed for given primary user
                 * and new login info
                 */
                const shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    newUser,
                    existingUser,
                    session,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                    };
                }
                /**
                 * checking if a recipe user already exists for the given
                 * login info
                 */
                let accountInfo;
                if (newUser.email !== undefined) {
                    accountInfo = {
                        email: newUser.email,
                    };
                } else if (newUser.phoneNumber !== undefined) {
                    accountInfo = {
                        phoneNumber: newUser.phoneNumber,
                    };
                } else if (newUser.thirdParty !== undefined) {
                    accountInfo = {
                        thirdPartyId: newUser.thirdParty.id,
                        thirdPartyUserId: newUser.thirdParty.userId,
                    };
                } else {
                    throw Error("this error should never be thrown");
                }
                /**
                 * We try and find if there is an existing recipe user for the same login method
                 * and same identifying info as the newUser object.
                 */
                let usersArrayThatHaveSameAccountInfoAsNewUser = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo,
                    userContext,
                });
                const userObjThatHasSameAccountInfoAndRecipeIdAsNewUser = usersArrayThatHaveSameAccountInfoAsNewUser.find(
                    (u) =>
                        u.loginMethods.find((lU) => {
                            if (lU.recipeId !== newUser.recipeId) {
                                return false;
                            }
                            if (newUser.recipeId === "thirdparty") {
                                if (lU.thirdParty === undefined) {
                                    return false;
                                }
                                return (
                                    lU.thirdParty.id === newUser.thirdParty.id &&
                                    lU.thirdParty.userId === newUser.thirdParty.userId
                                );
                            }
                            return lU.email === newUser.email || newUser.phoneNumber === newUser.phoneNumber;
                        })
                );
                if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser === undefined) {
                    /*
                Before proceeding to linking accounts, we need to create the recipe user ID associated
                with newUser. In order to do that in a secure way, we need to check if the accountInfo
                of the newUser is the same as of the existingUser - if it is, then we can go ahead, else
                we will have to check about the verification status of the newUser's accountInfo
                */
                    /**
                     * if recipe user doesn't exists, we check if
                     * any of the identifying info associated with
                     * the primary user equals to the identifying info
                     * of the given input. If so, return createRecipeUser
                     * as true to let the recipe know that a recipe user needs
                     * to be created and set updateVerificationClaim to false
                     * so the recipe will call back this function when the
                     * recipe user is created
                     */
                    let identitiesForExistingUser = this.transformUserInfoIntoVerifiedAndUnverifiedBucket(existingUser);
                    if (newUser.email !== undefined) {
                        let result =
                            identitiesForExistingUser.verified.emails.includes(newUser.email) ||
                            identitiesForExistingUser.unverified.emails.includes(newUser.email);
                        if (result) {
                            return {
                                createRecipeUser: true,
                                updateAccountLinkingClaim: "NO_CHANGE",
                            };
                        }
                    }
                    if (newUser.phoneNumber !== undefined) {
                        let result =
                            identitiesForExistingUser.verified.phoneNumbers.includes(newUser.phoneNumber) ||
                            identitiesForExistingUser.unverified.phoneNumbers.includes(newUser.phoneNumber);
                        if (result) {
                            return {
                                createRecipeUser: true,
                                updateAccountLinkingClaim: "NO_CHANGE",
                            };
                        }
                    }
                    /**
                     * checking if there already exists any other primary
                     * user which is associated with the account info
                     * for the newUser
                     */
                    const primaryUserIfExists = usersArrayThatHaveSameAccountInfoAsNewUser.find((u) => u.isPrimaryUser);
                    if (primaryUserIfExists !== undefined) {
                        // TODO: as per the lucid chart diagram, there should be an assert here?
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                            primaryUserId: primaryUserIfExists.id,
                        };
                    }
                    /**
                     * if the existing info is not verified, we do want
                     * to create a recipe user but don't want recipe
                     * to again callback this function for any further
                     * linking part. Instead, we want the recipe to
                     * update the session claim so it can be known that
                     * the new account needs to be verified. So, return
                     * createRecipeUser as true to let the recipe know
                     * that a recipe user needs to be created and set
                     * updateVerificationClaim to true so the recipe will
                     * not call back this function and update the session
                     * claim instead
                     */
                    if (!newUserVerified && shouldDoAccountLinking.shouldRequireVerification) {
                        return {
                            createRecipeUser: true,
                            updateAccountLinkingClaim: "ADD_CLAIM",
                        };
                    }
                    return {
                        createRecipeUser: true,
                        updateAccountLinkingClaim: "NO_CHANGE",
                    };
                }
                /**
                 * checking if the primary user (associated with session)
                 * and recipe user (associated with login info) can be
                 * linked
                 */
                let canLinkAccounts = yield this.recipeInterfaceImpl.canLinkAccounts({
                    recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id,
                    primaryUserId: existingUser.id,
                    userContext,
                });
                if (canLinkAccounts.status === "OK" && canLinkAccounts.accountsAlreadyLinked) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: true,
                        updateAccountLinkingClaim: "REMOVE_CLAIM",
                    };
                }
                if (
                    canLinkAccounts.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                    canLinkAccounts.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
                    /* ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR can be possible if
                - existingUser has email E1
                - you try and link an account with email E2
                - there already exists another primary account with email E2
                - so linking of existingUser and new account would fail
                - this is a stuck state cause the user will have to contact support or login to their other account.*/
                    /**
                 * RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR can be possible if:
                    - existingUser has email E1
                    - you try and link an account with email E2
                    - there already exists another primary account with email E2 that is linked to new account (input to this function)
                    - so linking of existingUser and new account would fail
                    - this is a stuck state cause the user will have to contact support or login to their other account.
                 */
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: canLinkAccounts.status,
                        primaryUserId: canLinkAccounts.primaryUserId,
                    };
                }
                let accountInfoForExistingUser = this.transformUserInfoIntoVerifiedAndUnverifiedBucket(existingUser);
                let newUserAccountInfoIsAssociatedWithExistingUser = false;
                let newUsersEmailAlreadyVerifiedInExistingUser = false;
                if (newUser.email !== undefined) {
                    newUserAccountInfoIsAssociatedWithExistingUser =
                        accountInfoForExistingUser.verified.emails.includes(newUser.email) ||
                        accountInfoForExistingUser.unverified.emails.includes(newUser.email);
                    newUsersEmailAlreadyVerifiedInExistingUser = accountInfoForExistingUser.verified.emails.includes(
                        newUser.email
                    );
                } else if (newUser.phoneNumber !== undefined) {
                    newUserAccountInfoIsAssociatedWithExistingUser =
                        accountInfoForExistingUser.verified.phoneNumbers.includes(newUser.phoneNumber) ||
                        accountInfoForExistingUser.unverified.phoneNumbers.includes(newUser.phoneNumber);
                }
                if (newUserAccountInfoIsAssociatedWithExistingUser) {
                    /**
                     * let Ly belong to P1 such that Ly equal to Lx.
                     * if LY verified or if Lx is verfied,
                     * then mark all Ly and Lx as verified
                     */
                    if (
                        newUser.email !== undefined &&
                        (newUsersEmailAlreadyVerifiedInExistingUser || newUserVerified)
                    ) {
                        let recipeUserIdsForEmailVerificationUpdate = existingUser.loginMethods
                            .filter((u) => u.email === newUser.email && !u.verified)
                            .map((l) => l.recipeUserId);
                        if (!newUserVerified) {
                            recipeUserIdsForEmailVerificationUpdate.push(
                                userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id
                            );
                        }
                        recipeUserIdsForEmailVerificationUpdate = Array.from(
                            new Set(recipeUserIdsForEmailVerificationUpdate)
                        );
                        for (let i = 0; i < recipeUserIdsForEmailVerificationUpdate.length; i++) {
                            const recipeUserId = recipeUserIdsForEmailVerificationUpdate[i];
                            yield this.markEmailAsVerified({
                                email: newUser.email,
                                recipeUserId,
                                userContext,
                            });
                        }
                    }
                } else {
                    if (shouldDoAccountLinking.shouldRequireVerification && !newUserVerified) {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            updateAccountLinkingClaim: "ADD_CLAIM",
                        };
                    }
                }
                const linkAccountResponse = yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id,
                    primaryUserId: existingUser.id,
                    userContext,
                });
                if (linkAccountResponse.status === "OK") {
                    return {
                        createRecipeUser: false,
                        accountsLinked: true,
                        updateAccountLinkingClaim: "REMOVE_CLAIM",
                    };
                } else {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        primaryUserId: linkAccountResponse.primaryUserId,
                        reason: linkAccountResponse.status,
                    };
                }
            });
        this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = ({ recipeUserId, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield __1.getUser(recipeUserId, userContext);
                if (user === undefined) {
                    return undefined;
                }
                if (user.isPrimaryUser) {
                    return user;
                }
                let pUser = yield this.recipeInterfaceImpl.fetchFromAccountToLinkTable({ recipeUserId, userContext });
                if (pUser !== undefined && pUser.isPrimaryUser) {
                    return pUser;
                }
                let accountInfo;
                let loginMethodInfo = user.loginMethods[0]; // this is a recipe user so there will be only one item in the array
                if (loginMethodInfo.email !== undefined) {
                    accountInfo = {
                        email: loginMethodInfo.email,
                    };
                } else if (loginMethodInfo.phoneNumber !== undefined) {
                    accountInfo = {
                        phoneNumber: loginMethodInfo.phoneNumber,
                    };
                } else if (loginMethodInfo.thirdParty !== undefined) {
                    accountInfo = {
                        thirdPartyId: loginMethodInfo.thirdParty.id,
                        thirdPartyUserId: loginMethodInfo.thirdParty.userId,
                    };
                } else {
                    throw Error("this error should never be thrown");
                }
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo,
                    userContext,
                });
                return users.find((u) => u.isPrimaryUser);
            });
        this.createPrimaryUserIdOrLinkAccountsAfterEmailVerification = ({ recipeUserId, session, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let primaryUser = yield this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                    recipeUserId,
                    userContext,
                });
                if (primaryUser === undefined) {
                    let user = yield __1.getUser(recipeUserId, userContext);
                    if (user === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    if (user.isPrimaryUser) {
                        // this can come here cause of a race condition.
                        yield this.createPrimaryUserIdOrLinkAccountsAfterEmailVerification({
                            recipeUserId,
                            session,
                            userContext,
                        });
                        return;
                    }
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        {
                            recipeId: user.loginMethods[0].recipeId,
                            email: user.loginMethods[0].email,
                            phoneNumber: user.loginMethods[0].phoneNumber,
                            thirdParty: user.loginMethods[0].thirdParty,
                        },
                        undefined,
                        session,
                        userContext
                    );
                    if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                        let response = yield this.recipeInterfaceImpl.createPrimaryUser({
                            recipeUserId: recipeUserId,
                            userContext,
                        });
                        if (response.status === "OK") {
                            // TODO: remove session claim
                        } else {
                            // it can come here cause of a race condition..
                            yield this.createPrimaryUserIdOrLinkAccountsAfterEmailVerification({
                                recipeUserId,
                                session,
                                userContext,
                            });
                        }
                    }
                } else {
                    /**
                     * recipeUser already linked with primaryUser
                     */
                    let recipeUser = primaryUser.loginMethods.find((u) => u.recipeUserId === recipeUserId);
                    if (recipeUser === undefined) {
                        let user = yield __1.getUser(recipeUserId, userContext);
                        if (user === undefined) {
                            throw Error("this error should never be thrown");
                        }
                        if (user.isPrimaryUser) {
                            // this can come here cause of a race condition.
                            yield this.createPrimaryUserIdOrLinkAccountsAfterEmailVerification({
                                recipeUserId,
                                session,
                                userContext,
                            });
                            return;
                        }
                        let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                            {
                                recipeId: user.loginMethods[0].recipeId,
                                email: user.loginMethods[0].email,
                                phoneNumber: user.loginMethods[0].phoneNumber,
                                thirdParty: user.loginMethods[0].thirdParty,
                            },
                            primaryUser,
                            session,
                            userContext
                        );
                        if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                            let linkAccountsResult = yield this.recipeInterfaceImpl.linkAccounts({
                                recipeUserId: recipeUserId,
                                primaryUserId: primaryUser.id,
                                userContext,
                            });
                            let primaryUserId = primaryUser.id;
                            if (
                                linkAccountsResult.status ===
                                    "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                                linkAccountsResult.status ===
                                    "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                            ) {
                                primaryUserId = linkAccountsResult.primaryUserId;
                            }
                            console.log(primaryUserId); // TODO NEMI: remove this
                            // TODO NEMI: The caller of this function should
                            // remove session claim if session claim exists
                            // else create a new session
                        }
                    }
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
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    getAPIsHandled() {
        return [];
    }
    handleAPIRequest(_id, _req, _response, _path, _method) {
        throw new Error("Should never come here");
    }
    handleError(error, _request, _response) {
        throw error;
    }
    getAllCORSHeaders() {
        return [];
    }
    isErrorFromThisRecipe(err) {
        return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "accountlinking";
