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
Object.defineProperty(exports, "__esModule", { value: true });
const recipeModule_1 = require("../../recipeModule");
const utils_1 = require("./utils");
const __1 = require("../..");
const supertokens_js_override_1 = require("supertokens-js-override");
const recipeImplementation_1 = require("./recipeImplementation");
const querier_1 = require("../../querier");
const error_1 = require("../../error");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.getIdentitiesForUser = (user) => {
            let identities = {
                verified: {
                    emails: [],
                    phoneNumbers: [],
                    thirdpartyInfo: [],
                },
                unverified: {
                    emails: [],
                    phoneNumbers: [],
                    thirdpartyInfo: [],
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
                        identities.verified.thirdpartyInfo.push(loginMethod.thirdParty);
                    } else {
                        identities.unverified.thirdpartyInfo.push(loginMethod.thirdParty);
                    }
                }
            }
            return identities;
        };
        this.isSignUpAllowed = ({ info, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let identifier;
                if (info.email !== undefined) {
                    identifier = {
                        email: info.email,
                    };
                } else if (info.phoneNumber !== undefined) {
                    identifier = {
                        phoneNumber: info.phoneNumber,
                    };
                } else {
                    throw Error("this error should never be thrown");
                }
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    info: identifier,
                    userContext,
                });
                if (users === undefined || users.length === 0) {
                    return true;
                }
                let primaryUser = users.find((u) => u.isPrimaryUser);
                if (primaryUser === undefined) {
                    return true;
                }
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    info,
                    primaryUser,
                    undefined,
                    userContext
                );
                let shouldRequireVerification = shouldDoAccountLinking.shouldAutomaticallyLink
                    ? shouldDoAccountLinking.shouldRequireVerification
                    : false;
                if (!shouldRequireVerification) {
                    return true;
                }
                let identitiesForPrimaryUser = this.getIdentitiesForUser(primaryUser);
                if (info.email !== undefined) {
                    return identitiesForPrimaryUser.verified.emails.includes(info.email);
                }
                if (info.phoneNumber !== undefined) {
                    return identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber);
                }
                throw Error("it should never reach here");
            });
        this.doPostSignUpAccountLinkingOperations = ({ info, infoVerified, recipeUserId, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    info,
                    undefined,
                    undefined,
                    userContext
                );
                if (
                    shouldDoAccountLinking.shouldAutomaticallyLink &&
                    shouldDoAccountLinking.shouldRequireVerification
                ) {
                    if (!infoVerified) {
                        return recipeUserId;
                    }
                }
                let canCreatePrimaryUserId = yield this.recipeInterfaceImpl.canCreatePrimaryUserId({
                    recipeUserId,
                    userContext,
                });
                if (canCreatePrimaryUserId) {
                    let user = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId,
                        userContext,
                    });
                    if (user.status !== "OK") {
                        throw Error("should never come here. Error from createPrimaryUser: " + user.status);
                    }
                    return user.user.id;
                }
                let identifier;
                if (info.email !== undefined) {
                    identifier = {
                        email: info.email,
                    };
                } else if (info.phoneNumber !== undefined) {
                    identifier = {
                        phoneNumber: info.phoneNumber,
                    };
                } else {
                    throw Error("this error should never be thrown");
                }
                let users = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                    info: identifier,
                    userContext,
                });
                if (users === undefined || users.length === 0) {
                    throw Error("this error should never be thrown");
                }
                let primaryUser = users.find((u) => u.isPrimaryUser);
                if (primaryUser === undefined) {
                    throw Error("this error should never be thrown");
                }
                shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    info,
                    primaryUser,
                    undefined,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    return recipeUserId;
                }
                let result = yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId,
                    primaryUserId: primaryUser.id,
                    userContext,
                });
                if (result.status !== "OK") {
                    throw Error("this error status shouldn't not be thrown. Error" + result.status);
                }
                return primaryUser.id;
            });
        this.accountLinkPostSignInViaSession = ({ session, info, infoVerified, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let userId = session.getUserId();
                let user = yield this.recipeInterfaceImpl.getUser({
                    userId,
                    userContext,
                });
                if (user === undefined) {
                    throw Error("this should not be thrown");
                }
                /**
                 * checking if the user with existing session
                 * is a primary user or not
                 */
                if (!user.isPrimaryUser) {
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        info,
                        undefined,
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
                    let recipeId = user.loginMethods[0].recipeId;
                    let recipeUser = yield __1.getUserForRecipeId(user.id, recipeId);
                    if (recipeUser.user === undefined) {
                        throw Error(
                            "This error should never be thrown. Check for bug in `getUserForRecipeId` function"
                        );
                    }
                    shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        recipeUser.user,
                        undefined,
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
                    if (shouldDoAccountLinking.shouldRequireVerification) {
                        if (!user.loginMethods[0].verified) {
                            return {
                                createRecipeUser: false,
                                accountsLinked: false,
                                reason: "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                            };
                        }
                    }
                    /**
                     * checking if primary user can be created for the existing recipe user
                     */
                    let canCreatePrimaryUser = yield this.recipeInterfaceImpl.canCreatePrimaryUserId({
                        recipeUserId: user.id,
                        userContext,
                    });
                    if (canCreatePrimaryUser.status !== "OK") {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: canCreatePrimaryUser.status,
                            primaryUserId: canCreatePrimaryUser.primaryUserId,
                        };
                    }
                    /**
                     * creating primary user for the recipe user
                     */
                    let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: user.id,
                        userContext,
                    });
                    if (createPrimaryUserResult.status !== "OK") {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: createPrimaryUserResult.status,
                            primaryUserId: createPrimaryUserResult.primaryUserId,
                        };
                    }
                    user = createPrimaryUserResult.user;
                }
                /**
                 * checking if account linking is allowed for given primary user
                 * and new login info
                 */
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    info,
                    user,
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
                let recipeInfo;
                if (info.recipeId === "emailpassword" && info.email !== undefined) {
                    recipeInfo = {
                        recipeId: "emailpassword",
                        email: info.email,
                    };
                } else if (info.recipeId === "thirdparty" && info.thirdParty !== undefined) {
                    recipeInfo = {
                        recipeId: "thirdparty",
                        thirdpartyId: info.thirdParty.id,
                        thirdpartyUserId: info.thirdParty.userId,
                    };
                } else if (info.recipeId === "passwordless" && info.email !== undefined) {
                    recipeInfo = {
                        recipeId: "passwordless",
                        email: info.email,
                    };
                } else if (info.recipeId === "passwordless" && info.phoneNumber !== undefined) {
                    recipeInfo = {
                        recipeId: "passwordless",
                        phoneNumber: info.phoneNumber,
                    };
                } else {
                    throw Error("this error should never be thrown");
                }
                let recipeUser = yield this.recipeInterfaceImpl.getUserByAccountInfo({
                    info: recipeInfo,
                    userContext,
                });
                if (recipeUser === undefined) {
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
                    let identitiesForPrimaryUser = this.getIdentitiesForUser(user);
                    if (info.email !== undefined) {
                        let result =
                            identitiesForPrimaryUser.verified.emails.includes(info.email) ||
                            identitiesForPrimaryUser.unverified.emails.includes(info.email);
                        if (result) {
                            return {
                                createRecipeUser: true,
                                updateVerificationClaim: false,
                            };
                        }
                    }
                    if (info.phoneNumber !== undefined) {
                        let result =
                            identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber) ||
                            identitiesForPrimaryUser.unverified.phoneNumbers.includes(info.phoneNumber);
                        if (result) {
                            return {
                                createRecipeUser: true,
                                updateVerificationClaim: false,
                            };
                        }
                    }
                    /**
                     * checking if there already exists any other primary
                     * user which is associated with the identifying info
                     * for the given input
                     */
                    let existingRecipeUserForInputInfo = yield this.recipeInterfaceImpl.listUsersByAccountInfo({
                        info: recipeInfo,
                        userContext,
                    });
                    if (existingRecipeUserForInputInfo !== undefined) {
                        let primaryUserIfExists = existingRecipeUserForInputInfo.find((u) => u.isPrimaryUser);
                        if (primaryUserIfExists !== undefined) {
                            return {
                                createRecipeUser: false,
                                accountsLinked: false,
                                reason: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                primaryUserId: primaryUserIfExists.id,
                            };
                        }
                    }
                    /**
                     * if the existing info is not verified, we do want
                     * to create a recipe user but don't want recipe
                     * to again callback this function for any further
                     * linking part. Instead, we want the recipe to
                     * update the session claim so it can be known that
                     * the new account needs to be verified. so, return
                     * createRecipeUser as true to let the recipe know
                     * that a recipe user needs to be created and set
                     * updateVerificationClaim to true so the recipe will
                     * not call back this function and update the session
                     * claim instead
                     */
                    if (!infoVerified) {
                        if (shouldDoAccountLinking.shouldRequireVerification) {
                            return {
                                createRecipeUser: true,
                                updateVerificationClaim: true,
                            };
                        }
                    }
                    return {
                        createRecipeUser: true,
                        updateVerificationClaim: false,
                    };
                }
                /**
                 * checking if th primary user (associated with session)
                 * and recipe user (associated with login info) can be
                 * linked
                 */
                let canLinkAccounts = yield this.recipeInterfaceImpl.canLinkAccounts({
                    recipeUserId: recipeUser.id,
                    primaryUserId: user.id,
                    userContext,
                });
                if (canLinkAccounts.status === "ACCOUNTS_ALREADY_LINKED_ERROR") {
                    return {
                        createRecipeUser: false,
                        accountsLinked: true,
                        updateVerificationClaim: false,
                    };
                }
                if (canLinkAccounts.status !== "OK") {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: canLinkAccounts.status,
                        primaryUserId: canLinkAccounts.primaryUserId,
                    };
                }
                let identitiesForPrimaryUser = this.getIdentitiesForUser(user);
                let recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser = false;
                if (info.email !== undefined) {
                    recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                        identitiesForPrimaryUser.verified.emails.includes(info.email) ||
                        identitiesForPrimaryUser.unverified.emails.includes(info.email);
                }
                if (!recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser && info.phoneNumber !== undefined) {
                    recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                        identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber) ||
                        identitiesForPrimaryUser.unverified.phoneNumbers.includes(info.phoneNumber);
                }
                if (recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser) {
                    /**
                     * TODO: let's Ly belongs to P1 such that Ly equal to Lx.
                     * if LY verified, mark Lx as verified. If Lx is verfied,
                     * then mark all Ly as verified
                     */
                } else {
                    if (shouldDoAccountLinking.shouldRequireVerification) {
                        if (!infoVerified) {
                            return {
                                createRecipeUser: false,
                                accountsLinked: false,
                                reason: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                            };
                        }
                    }
                }
                yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId: recipeUser.id,
                    primaryUserId: user.id,
                    userContext,
                });
                return {
                    createRecipeUser: false,
                    accountsLinked: true,
                    updateVerificationClaim: true,
                };
            });
        this.createPrimaryUserIdOrLinkAccounts = ({ recipeUserId, session, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let primaryUser = yield this.recipeInterfaceImpl.getPrimaryUserIdLinkedOrCanBeLinkedToRecipeUserId({
                    recipeUserId,
                    userContext,
                });
                if (primaryUser === undefined) {
                    let user = yield __1.getUser(recipeUserId, userContext);
                    if (user === undefined || user.isPrimaryUser) {
                        throw Error("this error should never be thrown");
                    }
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        Object.assign({}, user.loginMethods[0]),
                        undefined,
                        session,
                        userContext
                    );
                    if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                        yield this.recipeInterfaceImpl.createPrimaryUser({
                            recipeUserId: recipeUserId,
                            userContext,
                        });
                        // TODO: remove session claim
                    }
                } else {
                    /**
                     * recipeUser already linked with primaryUser
                     */
                    let recipeUser = primaryUser.loginMethods.find((u) => u.id === recipeUserId);
                    if (recipeUser === undefined) {
                        let user = yield __1.getUser(recipeUserId, userContext);
                        if (user === undefined || user.isPrimaryUser) {
                            throw Error("this error should never be thrown");
                        }
                        let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                            Object.assign({}, user.loginMethods[0]),
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
                            if (linkAccountsResult.status === "OK") {
                                // TODO: remove session claim if session claim exists
                                // else create a new session
                            }
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
