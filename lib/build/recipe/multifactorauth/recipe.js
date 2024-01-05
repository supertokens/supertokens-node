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
                    disabled: this.apiImpl.resyncSessionAndFetchMFAInfoPUT === undefined,
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
        this.checkForValidFirstFactor = async (tenantId, factorId, userContext) => {
            var _a;
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            if (tenantInfo === undefined) {
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }
            const { status: _ } = tenantInfo,
                tenantConfig = __rest(tenantInfo, ["status"]);
            // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
            // if validFirstFactors is undefined, we assume it's valid
            // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
            // so we don't need to do additional checks here
            let validFirstFactors =
                (_a = tenantConfig.firstFactors) !== null && _a !== void 0 ? _a : this.config.firstFactors;
            // We return a 401 if the factor is not a valid first factor. It's likely that the user
            // is trying to setup a secondary factor without an active session.
            // https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1874931338
            if (validFirstFactors !== undefined && !validFirstFactors.includes(factorId)) {
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Session is required for secondary factors",
                    payload: {
                        clearTokens: false,
                    },
                });
            }
        };
        this.checkIfFactorUserLinkedToSessionUser = (sessionUser, factorUser) => {
            // this is called during sign in operations to ensure the secondary factor user is linked to the session user
            // we disallow factor setup by sign in, and is allowed only via sign up
            if (sessionUser.id !== factorUser.id) {
                return {
                    status: "VALIDATION_ERROR",
                    reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_009)",
                };
            }
            return {
                status: "OK",
            };
        };
        this.checkAllowedToSetupFactorElseThrowInvalidClaimError = async (
            tenantId,
            session,
            sessionUser,
            factorId,
            userContext
        ) => {
            var _a, _b, _c, _d;
            // this is a utility function that populates all the necessary info for the recipe function
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            if (tenantInfo === undefined) {
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }
            const requiredSecondaryFactorsForUser = await this.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                userId: sessionUser.id,
                userContext: userContext,
            });
            const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
                user: sessionUser,
                userContext: userContext,
            });
            const completedFactorsClaimValue = await session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                userContext
            );
            const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
                user: sessionUser,
                accessTokenPayload: session.getAccessTokenPayload(userContext),
                tenantId: tenantId,
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
                userContext: userContext,
            });
            await this.recipeInterfaceImpl.checkAllowedToSetupFactorElseThrowInvalidClaimError({
                session: session,
                factorId: factorId,
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
                userContext: userContext,
            });
        };
        this.checkFactorUserAccountInfoForVerification = (sessionUser, accountInfo) => {
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
            // we allow setup of unverified account info only if the session user has the same account info
            // and it is verified
            if (accountInfo.email !== undefined) {
                let foundVerifiedEmail = false;
                for (const lM of sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.loginMethods) {
                    if (lM.email === accountInfo.email && lM.verified) {
                        foundVerifiedEmail = true;
                        break;
                    }
                }
                if (!foundVerifiedEmail) {
                    return {
                        status: "VALIDATION_ERROR",
                        reason:
                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_010)",
                    };
                }
            }
            if (accountInfo.phoneNumber !== undefined) {
                let foundVerifiedPhoneNumber = false;
                for (const lM of sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.loginMethods) {
                    if (lM.phoneNumber === accountInfo.phoneNumber) {
                        foundVerifiedPhoneNumber = true;
                        break;
                    }
                }
                if (!foundVerifiedPhoneNumber) {
                    throw new Error("should never happen"); // phone number only comes from passwordless and is a verified factor always
                }
            }
            return {
                status: "OK",
            };
        };
        this.checkIfFactorUserCanBeLinkedWithSessionUser = async (tenantId, sessionUser, accountInfo, userContext) => {
            if (!sessionUser.isPrimaryUser) {
                const canCreatePrimary = await recipe_3.default.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
                    recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                    userContext,
                });
                if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    // Race condition since we just checked that it was not a primary user
                    this.querier.invalidateCoreCallCache(userContext);
                    return {
                        status: "RECURSE_FOR_RACE",
                    };
                }
                if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                    return {
                        status: "VALIDATION_ERROR",
                        reason:
                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_011)",
                    };
                }
            }
            // Check if there if the linking with session user going to fail and avoid user creation here
            const users = await __1.listUsersByAccountInfo(
                tenantId,
                { email: accountInfo.email, phoneNumber: accountInfo.phoneNumber },
                true,
                userContext
            );
            for (const user of users) {
                if (user.isPrimaryUser && user.id !== sessionUser.id) {
                    return {
                        status: "VALIDATION_ERROR",
                        reason:
                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_012)",
                    };
                }
            }
            return {
                status: "OK",
            };
        };
        this.linkAccountsForFactorSetup = async (sessionUser, factorUserRecipeUserId, userContext) => {
            // if we are here, it means that all the validations passed in the first place. So any error
            // in this function must result in retry from the validation.
            // At this point, we have the recipe user for the new factor created. This means that
            // when retrying for passwordless / thirdparty signInUp, where we check for existing user,
            // we are going to find the user with the account info, technically converting this from
            // sign up to a sign in operation. We need this behaviour to make the API repeatable.
            // For emailpassword sign up, when we retry, the return point would be from the validation.
            if (!sessionUser.isPrimaryUser) {
                const createPrimaryRes = await recipe_3.default.getInstance().recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId: new recipeUserId_1.default(sessionUser.id),
                    userContext,
                });
                if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    this.querier.invalidateCoreCallCache(userContext);
                    return {
                        status: "RECURSE_FOR_RACE",
                    };
                } else if (
                    createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
                    this.querier.invalidateCoreCallCache(userContext);
                    return {
                        status: "RECURSE_FOR_RACE",
                    };
                }
            }
            const linkRes = await recipe_3.default.getInstance().recipeInterfaceImpl.linkAccounts({
                recipeUserId: factorUserRecipeUserId,
                primaryUserId: sessionUser.id,
                userContext,
            });
            if (linkRes.status !== "OK") {
                this.querier.invalidateCoreCallCache(userContext);
                return {
                    status: "RECURSE_FOR_RACE",
                };
            }
            return {
                status: "OK",
            };
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
