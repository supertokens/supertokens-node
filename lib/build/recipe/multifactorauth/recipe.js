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
const session_1 = __importDefault(require("../session"));
const recipe_2 = __importDefault(require("../accountlinking/recipe"));
const __1 = require("../..");
const querier_1 = require("../../querier");
const error_2 = __importDefault(require("../session/error"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.getFactorsSetupForUserFromOtherRecipesFuncs = [];
        this.allAvailableFactorIds = [];
        this.allAvailableFirstFactorIds = [];
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.GET_MFA_INFO),
                    id: constants_1.GET_MFA_INFO,
                    disabled: this.apiImpl.mfaInfoGET === undefined,
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
            if (id === constants_1.GET_MFA_INFO) {
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
        this.addAvailableFactorIdsFromOtherRecipes = (factorIds, firstFactorIds) => {
            this.allAvailableFactorIds = this.allAvailableFactorIds.concat(factorIds);
            this.allAvailableFirstFactorIds = this.allAvailableFirstFactorIds.concat(firstFactorIds);
        };
        this.getAllAvailableFactorIds = () => {
            return this.allAvailableFactorIds;
        };
        this.getAllAvailableFirstFactorIds = () => {
            return this.allAvailableFirstFactorIds;
        };
        this.addGetFactorsSetupForUserFromOtherRecipes = (func) => {
            this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
        };
        this.getFactorsSetupForUser = async (user, tenantConfig, userContext) => {
            let factorIds = [];
            for (const func of this.getFactorsSetupForUserFromOtherRecipesFuncs) {
                let result = await func(user, tenantConfig, userContext);
                if (result !== undefined) {
                    factorIds = factorIds.concat(result);
                }
            }
            return factorIds;
        };
        this.validateForMultifactorAuthBeforeFactorCompletion = async ({
            tenantId,
            factorIdInProgress,
            session,
            userLoggingIn,
            isAlreadySetup,
            userContext,
        }) => {
            var _a, _b, _c, _d;
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            const validFirstFactors =
                (tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.firstFactors) ||
                this.config.firstFactors ||
                this.getAllAvailableFirstFactorIds();
            if (session === undefined) {
                // No session exists, so we need to check if it's a valid first factor before proceeding
                if (!validFirstFactors.includes(factorIdInProgress)) {
                    return {
                        status: "DISALLOWED_FIRST_FACTOR_ERROR",
                    };
                }
                return {
                    status: "OK",
                };
            }
            let sessionUser;
            if (userLoggingIn) {
                if (userLoggingIn.id !== session.getUserId()) {
                    // the user trying to login is not linked to the session user, based on session behaviour
                    // we just return OK and do nothing or replace replace the existing session with a new one
                    // we are doing this because we allow factor setup only when creating a new user
                    // this can happen when you got into login screen with an existing session and tried to log in with a different credentials
                    // or a case while doing secondary factor for phone otp but the user created a different account with the same phone number
                    return {
                        status: "OK",
                    };
                }
                sessionUser = userLoggingIn;
            } else {
                sessionUser = await __1.getUser(session.getUserId(), userContext);
            }
            if (!sessionUser) {
                // Session user doesn't exist, maybe the user was deleted
                // Race condition, user got deleted in parallel, throw unauthorized
                throw new error_2.default({
                    type: error_2.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            if (isAlreadySetup) {
                return {
                    status: "OK",
                };
            }
            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const defaultRequiredFactorIdsForUser = await this.recipeInterfaceImpl.getDefaultRequiredFactorsForUser({
                user: sessionUser,
                tenantId,
                userContext,
            });
            const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
                user: sessionUser,
                tenantId,
                userContext,
            });
            const completedFactorsClaimValue = await session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                userContext
            );
            const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
                user: sessionUser,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
                factorsSetUpForUser,
                defaultRequiredFactorIdsForTenant:
                    (_a =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _a !== void 0
                        ? _a
                        : [],
                defaultRequiredFactorIdsForUser,
                completedFactors:
                    (_b =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _b !== void 0
                        ? _b
                        : {},
                userContext,
            });
            const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
                session,
                factorId: factorIdInProgress,
                completedFactors:
                    (_c =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _c !== void 0
                        ? _c
                        : {},
                defaultRequiredFactorIdsForTenant:
                    (_d =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _d !== void 0
                        ? _d
                        : [],
                defaultRequiredFactorIdsForUser,
                factorsSetUpForUser,
                mfaRequirementsForAuth,
                userContext,
            });
            if (!canSetup) {
                return {
                    status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                };
            }
            return {
                status: "OK",
            };
        };
        this.createOrUpdateSessionForMultifactorAuthAfterFactorCompletion = async ({
            req,
            res,
            tenantId,
            factorIdInProgress,
            justCompletedFactorUserInfo,
            userContext,
        }) => {
            let session = await session_1.default.getSession(req, res, { sessionRequired: false });
            if (
                session === undefined // no session exists, so we can create a new one
            ) {
                if (justCompletedFactorUserInfo === undefined) {
                    throw new Error("should never come here"); // We wouldn't create new session from a recipe like TOTP
                }
                const newSession = await session_1.default.createNewSession(
                    req,
                    res,
                    tenantId,
                    justCompletedFactorUserInfo.recipeUserId,
                    {},
                    {},
                    userContext
                );
                await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: newSession,
                    factorId: factorIdInProgress,
                    userContext,
                });
                return {
                    status: "OK",
                    session: newSession,
                };
            }
            while (true) {
                // loop to handle race conditions
                const sessionUser = await __1.getUser(session.getUserId(), userContext);
                // race condition, user deleted throw unauthorized
                if (sessionUser === undefined) {
                    throw new error_2.default({
                        type: error_2.default.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }
                if (justCompletedFactorUserInfo !== undefined) {
                    if (justCompletedFactorUserInfo.createdNewUser) {
                        // This is a newly created user, so it must be account linked with the session user
                        if (!sessionUser.isPrimaryUser) {
                            const createPrimaryRes = await recipe_2.default
                                .getInstance()
                                .recipeInterfaceImpl.createPrimaryUser({
                                    recipeUserId: new recipeUserId_1.default(sessionUser.id),
                                    userContext,
                                });
                            if (
                                createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                            ) {
                                // Race condition
                                this.querier.invalidateCoreCallCache(userContext);
                                continue;
                            } else if (
                                createPrimaryRes.status ===
                                "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                            ) {
                                return {
                                    status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                    message:
                                        "Error setting up MFA for the user. Please contact support. (ERR_CODE_011)",
                                };
                            }
                        }
                        const linkRes = await recipe_2.default.getInstance().recipeInterfaceImpl.linkAccounts({
                            recipeUserId: justCompletedFactorUserInfo.recipeUserId,
                            primaryUserId: sessionUser.id,
                            userContext,
                        });
                        if (linkRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                            return {
                                status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                message:
                                    "Error setting up MFA for the user because of the automatic account linking. Please contact support. (ERR_CODE_013)",
                            };
                        } else if (linkRes.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                            // Race condition
                            this.querier.invalidateCoreCallCache(userContext);
                            continue;
                        } else if (
                            linkRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        ) {
                            return {
                                status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                message:
                                    "Cannot complete factor setup as the account info is already associated with another primary user. Please contact support. (ERR_CODE_012)",
                            };
                        }
                    } else {
                        // Not a new user we should check if the user is linked to the session user
                        const loggedInUserLinkedToSessionUser = sessionUser.id === justCompletedFactorUserInfo.user.id;
                        if (!loggedInUserLinkedToSessionUser) {
                            // we may keep or replace the session as per the flag overwriteSessionDuringSignIn in session recipe
                            if (recipe_1.default.getInstanceOrThrowError().config.overwriteSessionDuringSignIn) {
                                session = await session_1.default.createNewSession(
                                    req,
                                    res,
                                    tenantId,
                                    justCompletedFactorUserInfo.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                            }
                            return {
                                status: "OK",
                                session: session,
                            };
                        }
                    }
                }
                break;
            }
            await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                session: session,
                factorId: factorIdInProgress,
                userContext,
            });
            return {
                status: "OK",
                session: session,
            };
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
                            multiFactorAuthClaim_1.MultiFactorAuthClaim.validators.hasCompletedDefaultFactors()
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
