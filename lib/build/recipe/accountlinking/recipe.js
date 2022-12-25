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
const __1 = require("../..");
const supertokens_1 = require("../../supertokens");
const utils_1 = require("./utils");
const supertokens_js_override_1 = require("supertokens-js-override");
const recipeImplementation_1 = require("./recipeImplementation");
const querier_1 = require("../../querier");
const error_1 = require("../../error");
const normalisedURLPath_1 = require("../../normalisedURLPath");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.getIdentitiesForPrimaryUserId = (primaryUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield querier_1.Querier.getNewInstanceOrThrowError(this.getRecipeId()).sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/identities"),
                    {
                        primaryUserId,
                    }
                );
            });
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
                let users = yield __1.default.listUsersByAccountInfo({
                    info: identifier,
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
                /**
                 * DISCUSS: new API in core which returns all the verified identities for primaryUserId
                 */
                let identitiesForPrimaryUser = yield this.getIdentitiesForPrimaryUserId(primaryUser.id);
                if (info.email !== undefined) {
                    return identitiesForPrimaryUser.verified.emails.includes(info.email);
                }
                if (info.phoneNumber !== undefined) {
                    return identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber);
                }
                throw Error("it should never reach here");
            });
        this.createPrimaryUserIdOrLinkAccountPostSignUp = ({ info, infoVerified, recipeUserId, userContext }) =>
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
                        throw Error(user.status);
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
                let users = yield __1.default.listUsersByAccountInfo({
                    info: identifier,
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
                yield this.recipeInterfaceImpl.linkAccounts({
                    recipeUserId,
                    primaryUserId: primaryUser.id,
                    userContext,
                });
                return primaryUser.id;
            });
        // TODO: account linking failures needs to be improved
        this.accountLinkPostSignInViaSession = ({ session, info, infoVerified, userContext }) =>
            __awaiter(this, void 0, void 0, function* () {
                let userId = session.getUserId();
                let user = yield __1.getUser({
                    userId,
                });
                if (user === undefined) {
                    throw Error("this should not be thrown");
                }
                if (!user.isPrimaryUser) {
                    let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        info,
                        undefined,
                        session,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        throw Error("Acount linking failure");
                    }
                    let recipeId = user.linkedRecipes[0].recipeId;
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
                    let recipeUser = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                        userId: user.id,
                    });
                    shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                        recipeUser.user,
                        undefined,
                        session,
                        userContext
                    );
                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        throw Error("Acount linking failure");
                    }
                    if (shouldDoAccountLinking.shouldRequireVerification) {
                        if (!infoVerified) {
                            throw Error("Account link failure");
                        }
                    }
                    let canCreatePrimaryUser = yield this.recipeInterfaceImpl.canCreatePrimaryUserId({
                        recipeUserId: user.id,
                        userContext,
                    });
                    if (canCreatePrimaryUser.status !== "OK") {
                        throw canCreatePrimaryUser;
                    }
                    let createPrimaryUserResult = yield this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: user.id,
                        userContext,
                    });
                    if (createPrimaryUserResult.status !== "OK") {
                        throw createPrimaryUserResult;
                    }
                    user = createPrimaryUserResult.user;
                }
                let shouldDoAccountLinking = yield this.config.shouldDoAutomaticAccountLinking(
                    info,
                    user,
                    session,
                    userContext
                );
                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    throw Error("account linking failure");
                }
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
                let recipeUser = yield __1.getUserByAccountInfoAndRecipeId({
                    info: recipeInfo,
                });
                if (recipeUser === undefined) {
                    let identitiesForPrimaryUser = yield this.getIdentitiesForPrimaryUserId(user.id);
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
                    let existingRecipeUserForInputInfo = yield __1.listUsersByAccountInfo({
                        info: recipeInfo,
                    });
                    if (existingRecipeUserForInputInfo !== undefined) {
                        let doesPrimaryUserIdAlreadyExists =
                            existingRecipeUserForInputInfo.find((u) => u.isPrimaryUser) !== undefined;
                        if (doesPrimaryUserIdAlreadyExists) {
                            throw Error("account linking failure");
                        }
                    }
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
                    };
                }
                let identitiesForPrimaryUser = yield this.getIdentitiesForPrimaryUserId(user.id);
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
                            throw Error("account link failure");
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
        this.config = utils_1.validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
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
        if (Recipe.instance === undefined) {
            Recipe.init({})(
                supertokens_1.default.getInstanceOrThrowError().appInfo,
                supertokens_1.default.getInstanceOrThrowError().isInServerlessEnv
            );
        }
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
