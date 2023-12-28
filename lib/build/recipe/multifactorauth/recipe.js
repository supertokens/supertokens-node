"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("../../error"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const utils_1 = require("./utils");
const mfaInfo_1 = __importDefault(require("./api/mfaInfo"));
const recipe_1 = __importDefault(require("../session/recipe"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const multitenancy_1 = __importDefault(require("../multitenancy"));
const recipe_2 = __importDefault(require("../multitenancy/recipe"));
const recipe_3 = __importDefault(require("../accountlinking/recipe"));
const __1 = require("../..");
const querier_1 = require("../../querier");
const error_2 = __importDefault(require("../session/error"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.getFactorsSetupForUserFromOtherRecipesFuncs = [];
        this.getAllFactorsFromOtherRecipesFunc = [];
        this.getEmailsForFactorFromOtherRecipesFunc = [];
        this.getPhoneNumbersForFactorFromOtherRecipesFunc = [];
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "put",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.UPDATE_SESSION_AND_FETCH_MFA_INFO
                    ),
                    id: constants_1.UPDATE_SESSION_AND_FETCH_MFA_INFO,
                    disabled: this.apiImpl.updateSessionAndFetchMfaInfoPUT === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, _tenantId, req, res, _, __, userContext) => {
            let options = {
                recipeInstance: this,
                recipeImplementation: this.recipeInterfaceImpl,
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                req,
                res,
            };
            if (id === constants_1.UPDATE_SESSION_AND_FETCH_MFA_INFO) {
                return await mfaInfo_1.default(this.apiImpl, options, userContext);
            }
            throw new Error("should never come here");
        };
        this.handleError = async (err, _, __) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.addGetAllFactorsFromOtherRecipesFunc = (f) => {
            this.getAllFactorsFromOtherRecipesFunc.push(f);
        };
        this.getAllAvailableFactorIds = (tenantConfig) => {
            let factorIds = [];
            for (const func of this.getAllFactorsFromOtherRecipesFunc) {
                const factorIdsRes = func(tenantConfig);
                for (const factorId of factorIdsRes.factorIds) {
                    if (!factorIds.includes(factorId)) {
                        factorIds.push(factorId);
                    }
                }
            }
            return factorIds;
        };
        this.getAllAvailableFirstFactorIds = (tenantConfig) => {
            let factorIds = [];
            for (const func of this.getAllFactorsFromOtherRecipesFunc) {
                const factorIdsRes = func(tenantConfig);
                for (const factorId of factorIdsRes.firstFactorIds) {
                    if (!factorIds.includes(factorId)) {
                        factorIds.push(factorId);
                    }
                }
            }
            return factorIds;
        };
        this.addGetFactorsSetupForUserFromOtherRecipes = (func) => {
            this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
        };
        this.validateForMultifactorAuthBeforeFactorCompletion = async (input) => {
            var _a, _b, _c, _d;
            const tenantInfo = await multitenancy_1.default.getTenant(input.tenantId, input.userContext);
            if (tenantInfo === undefined) {
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }
            const { status: _ } = tenantInfo,
                tenantConfig = __rest(tenantInfo, ["status"]);
            let validFirstFactors;
            if (tenantConfig.firstFactors !== undefined) {
                validFirstFactors = tenantConfig.firstFactors; // First Priority, first factors configured for tenant
            } else if (this.config.firstFactors !== undefined) {
                validFirstFactors = this.config.firstFactors; // Second Priority, first factors configured in the recipe
            } else {
                validFirstFactors = this.getAllAvailableFirstFactorIds(tenantConfig); // Last Priority, first factors based on initialised recipes
            }
            if (input.session === undefined) {
                // No session exists, so we need to check if it's a valid first factor before proceeding
                if (!validFirstFactors.includes(input.factorIdInProgress)) {
                    return {
                        status: "INVALID_FIRST_FACTOR_ERROR",
                    };
                }
                return {
                    status: "OK",
                };
            }
            if ("userSigningInForFactor" in input) {
                if (input.userSigningInForFactor.id !== input.session.getUserId()) {
                    // here the user logging in is not linked to the session user and
                    // we do not allow factor setup for existing users through sign in.
                    // we allow factor setup only through sign up
                    return {
                        status: "UNRELATED_USER_SIGN_IN_ERROR",
                    };
                }
                // we assume factor is already setup because the user logging in is already linked to the session user
                return {
                    status: "OK",
                };
            }
            let sessionUser = await __1.getUser(input.session.getUserId(), input.userContext);
            if (!sessionUser) {
                // Session user doesn't exist, maybe the user was deleted
                // Race condition, user got deleted in parallel, throw unauthorized
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            if (input.isAlreadySetup) {
                return {
                    status: "OK",
                };
            }
            // Check if the new user being created can be considered for factor setup for MFA on the following conditions:
            // 1. the new factor is a verified factor or the session user has a login method with same email and is verified
            // 2. linking of the new user with the session user should not fail
            if (input.signUpInfo !== undefined) {
                if (!input.signUpInfo.isVerifiedFactor) {
                    /*
                        We discussed another method but did not go ahead with it, details below:
    
                        We can allow the second factor to be linked to first factor even if the emails are different
                        and not verified as long as there is no other user that exists (recipe or primary) that has the
                        same email as that of the second factor. For example, if first factor is google login with e1
                        and second factor is email password with e2, we allow linking them as long as there is no other
                        user with email e2.
    
                        We rejected this idea cause if auto account linking is switched off, then someone else can sign up
                        with google using e2. This is OK as it would not link (since account linking is switched off).
                        But, then if account linking is switched on, then the google sign in (and not sign up) with e2
                        would actually cause it to be linked with the e1 account.
                    */
                    if (input.signUpInfo.email !== undefined) {
                        let foundVerifiedEmail = false;
                        for (const lM of sessionUser === null || sessionUser === void 0
                            ? void 0
                            : sessionUser.loginMethods) {
                            if (lM.email === input.signUpInfo.email && lM.verified) {
                                foundVerifiedEmail = true;
                                break;
                            }
                        }
                        if (!foundVerifiedEmail) {
                            return {
                                status: "EMAIL_NOT_VERIFIED_ERROR",
                            };
                        }
                    }
                    if (input.signUpInfo.phoneNumber !== undefined) {
                        let foundVerifiedPhoneNumber = false;
                        for (const lM of sessionUser === null || sessionUser === void 0
                            ? void 0
                            : sessionUser.loginMethods) {
                            if (lM.phoneNumber === input.signUpInfo.phoneNumber) {
                                foundVerifiedPhoneNumber = true;
                                break;
                            }
                        }
                        if (!foundVerifiedPhoneNumber) {
                            return {
                                status: "PHONE_NUMBER_NOT_VERIFIED_ERROR",
                            };
                        }
                    }
                }
                if (!sessionUser.isPrimaryUser) {
                    const canCreatePrimary = await recipe_3.default
                        .getInstance()
                        .recipeInterfaceImpl.canCreatePrimaryUser({
                            recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                            userContext: input.userContext,
                        });
                    if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        // RACE since we just checked that it was not a primary user
                        this.querier.invalidateCoreCallCache(input.userContext);
                        return {
                            status: "RECURSE_FOR_RACE",
                        };
                    }
                    if (
                        canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        return {
                            status: "SESSION_USER_CANNOT_BECOME_PRIMARY_ERROR",
                        };
                    }
                }
                // Check if there if the linking with session user going to fail and avoid user creation here
                const users = await __1.listUsersByAccountInfo(
                    input.tenantId,
                    { email: input.signUpInfo.email },
                    undefined,
                    input.userContext
                );
                for (const user of users) {
                    if (user.isPrimaryUser && user.id !== sessionUser.id) {
                        return {
                            status: "CANNOT_LINK_FACTOR_ACCOUNT_ERROR",
                        };
                    }
                }
            }
            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const requiredSecondaryFactorsForUser = await this.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                userId: sessionUser.id,
                userContext: input.userContext,
            });
            const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
                user: sessionUser,
                userContext: input.userContext,
            });
            const completedFactorsClaimValue = await input.session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                input.userContext
            );
            const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
                user: sessionUser,
                accessTokenPayload: input.session.getAccessTokenPayload(input.userContext),
                tenantId: input.tenantId,
                factorsSetUpForUser,
                requiredSecondaryFactorsForTenant:
                    (_a = tenantInfo.requiredSecondaryFactors) !== null && _a !== void 0 ? _a : [],
                requiredSecondaryFactorsForUser,
                completedFactors:
                    (_b =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _b !== void 0
                        ? _b
                        : {},
                userContext: input.userContext,
            });
            const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
                session: input.session,
                factorId: input.factorIdInProgress,
                completedFactors:
                    (_c =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _c !== void 0
                        ? _c
                        : {},
                requiredSecondaryFactorsForTenant:
                    (_d = tenantInfo.requiredSecondaryFactors) !== null && _d !== void 0 ? _d : [],
                requiredSecondaryFactorsForUser,
                factorsSetUpForUser,
                mfaRequirementsForAuth,
                userContext: input.userContext,
            });
            if (!canSetup) {
                return {
                    status: "FACTOR_SETUP_DISALLOWED_FOR_USER_ERROR",
                };
            }
            return {
                status: "OK",
            };
        };
        this.updateSessionAndUserAfterFactorCompletion = async ({
            session,
            isFirstFactor,
            factorId,
            userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor,
            userContext,
        }) => {
            if (isFirstFactor) {
                await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session,
                    factorId: factorId,
                    userContext,
                });
                return {
                    status: "OK",
                };
            }
            const sessionUser = await __1.getUser(session.getUserId(), userContext);
            // race condition, user deleted throw unauthorized
            if (sessionUser === undefined) {
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            if (userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor !== undefined) {
                if (userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.createdNewUser) {
                    // This is a newly created user, so it must be account linked with the session user
                    if (!sessionUser.isPrimaryUser) {
                        const createPrimaryRes = await recipe_3.default
                            .getInstance()
                            .recipeInterfaceImpl.createPrimaryUser({
                                recipeUserId: new recipeUserId_1.default(sessionUser.id),
                                userContext,
                            });
                        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                            this.querier.invalidateCoreCallCache(userContext);
                            return {
                                status: "RECURSE_FOR_RACE",
                            };
                        } else if (
                            createPrimaryRes.status ===
                            "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        ) {
                            this.querier.invalidateCoreCallCache(userContext);
                            return {
                                status: "RECURSE_FOR_RACE",
                            };
                        }
                    }
                    const linkRes = await recipe_3.default.getInstance().recipeInterfaceImpl.linkAccounts({
                        recipeUserId: userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.recipeUserId,
                        primaryUserId: sessionUser.id,
                        userContext,
                    });
                    if (linkRes.status !== "OK") {
                        this.querier.invalidateCoreCallCache(userContext);
                        return {
                            status: "RECURSE_FOR_RACE",
                        };
                    }
                } else {
                    // Not a new user we should check if the user is linked to the session user
                    const loggedInUserLinkedToSessionUser =
                        sessionUser.id === userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.user.id;
                    if (!loggedInUserLinkedToSessionUser) {
                        return {
                            status: "RECURSE_FOR_RACE",
                        };
                    }
                }
            }
            await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                session: session,
                factorId: factorId,
                userContext,
            });
            return {
                status: "OK",
            };
        };
        this.getReasonForStatus = (status) => {
            switch (status) {
                case "INVALID_FIRST_FACTOR_ERROR":
                    return `This login method is not a valid first factor.`;
                case "UNRELATED_USER_SIGN_IN_ERROR":
                    return "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)";
                case "EMAIL_NOT_VERIFIED_ERROR":
                    return "The factor setup is not allowed because the email is not verified. Please contact support. (ERR_CODE_010)";
                case "PHONE_NUMBER_NOT_VERIFIED_ERROR":
                    return "The factor setup is not allowed because the phone number is not verified. Please contact support. (ERR_CODE_011)";
                case "SESSION_USER_CANNOT_BECOME_PRIMARY_ERROR":
                case "CANNOT_LINK_FACTOR_ACCOUNT_ERROR":
                    return "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)";
                case "FACTOR_SETUP_DISALLOWED_FOR_USER_ERROR":
                    return "Factor setup was disallowed due to security reasons. Please contact support. (ERR_CODE_013)";
            }
        };
        this.addGetEmailsForFactorFromOtherRecipes = (func) => {
            this.getEmailsForFactorFromOtherRecipesFunc.push(func);
        };
        this.getEmailsForFactors = (user, sessionRecipeUserId) => {
            let result = {};
            for (const func of this.getEmailsForFactorFromOtherRecipesFunc) {
                result = Object.assign(Object.assign({}, result), func(user, sessionRecipeUserId));
            }
            return result;
        };
        this.addGetPhoneNumbersForFactorsFromOtherRecipes = (func) => {
            this.getPhoneNumbersForFactorFromOtherRecipesFunc.push(func);
        };
        this.getPhoneNumbersForFactors = (user, sessionRecipeUserId) => {
            let result = {};
            for (const func of this.getPhoneNumbersForFactorFromOtherRecipesFunc) {
                result = Object.assign(Object.assign({}, result), func(user, sessionRecipeUserId));
            }
            return result;
        };
        this.config = utils_1.validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(recipeImplementation_1.default(this));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mtRecipe = recipe_2.default.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.staticFirstFactors = this.config.firstFactors;
            }
        });
        this.querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    static getInstance() {
        return Recipe.instance;
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                // We do not want to add the MFA claim as a global claim (which would make createNewSession set it up)
                // because we want to add it in the sign-in APIs manually.
                postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    recipe_1.default
                        .getInstanceOrThrowError()
                        .addClaimValidatorFromOtherRecipe(
                            multiFactorAuthClaim_1.MultiFactorAuthClaim.validators.hasCompletedMFARequirementForAuth()
                        );
                });
                return Recipe.instance;
            } else {
                throw new Error(
                    "MultiFactorAuth recipe has already been initialised. Please check your code for bugs."
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "multifactorauth";
