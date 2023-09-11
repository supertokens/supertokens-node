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
exports.getOpenIdDiscoveryConfiguration = exports.getJWKS = exports.createJWT = exports.Error = exports.validateClaimsForSessionHandle = exports.removeClaim = exports.getClaimValue = exports.setClaimValue = exports.fetchAndSetClaim = exports.mergeIntoAccessTokenPayload = exports.updateSessionDataInDatabase = exports.revokeMultipleSessions = exports.revokeSession = exports.getAllSessionHandlesForUser = exports.revokeAllSessionsForUser = exports.refreshSessionWithoutRequestResponse = exports.refreshSession = exports.getSessionInformation = exports.getSessionWithoutRequestResponse = exports.getSession = exports.createNewSessionWithoutRequestResponse = exports.createNewSession = exports.init = void 0;
const error_1 = __importDefault(require("./error"));
const recipe_1 = __importDefault(require("./recipe"));
const utils_1 = require("./utils");
const sessionRequestFunctions_1 = require("./sessionRequestFunctions");
const __1 = require("../..");
const constants_1 = require("../multitenancy/constants");
const constants_2 = require("./constants");
class SessionWrapper {
    static async createNewSession(
        req,
        res,
        tenantId,
        recipeUserId,
        accessTokenPayload = {},
        sessionDataInDatabase = {},
        userContext = {}
    ) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const appInfo = recipeInstance.getAppInfo();
        let user = await __1.getUser(recipeUserId.getAsString(), userContext);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }
        return await sessionRequestFunctions_1.createNewSessionInRequest({
            req,
            res,
            userContext,
            recipeInstance,
            accessTokenPayload,
            userId,
            recipeUserId,
            config,
            appInfo,
            sessionDataInDatabase,
            tenantId,
        });
    }
    static async createNewSessionWithoutRequestResponse(
        tenantId,
        recipeUserId,
        accessTokenPayload = {},
        sessionDataInDatabase = {},
        disableAntiCsrf = false,
        userContext = {}
    ) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
        const appInfo = recipeInstance.getAppInfo();
        const issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
        let finalAccessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { iss: issuer });
        for (const prop of constants_2.protectedProps) {
            delete finalAccessTokenPayload[prop];
        }
        let user = await __1.getUser(recipeUserId.getAsString(), userContext);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }
        for (const claim of claimsAddedByOtherRecipes) {
            const update = await claim.build(userId, recipeUserId, tenantId, userContext);
            finalAccessTokenPayload = Object.assign(Object.assign({}, finalAccessTokenPayload), update);
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            userId,
            recipeUserId,
            accessTokenPayload: finalAccessTokenPayload,
            sessionDataInDatabase,
            disableAntiCsrf,
            tenantId,
            userContext,
        });
    }
    static async validateClaimsForSessionHandle(sessionHandle, overrideGlobalClaimValidators, userContext = {}) {
        const recipeImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const sessionInfo = await recipeImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
        if (sessionInfo === undefined) {
            return {
                status: "SESSION_DOES_NOT_EXIST_ERROR",
            };
        }
        const claimValidatorsAddedByOtherRecipes = recipe_1.default
            .getInstanceOrThrowError()
            .getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators = await recipeImpl.getGlobalClaimValidators({
            userId: sessionInfo.userId,
            recipeUserId: sessionInfo.recipeUserId,
            tenantId: sessionInfo.tenantId,
            claimValidatorsAddedByOtherRecipes,
            userContext,
        });
        const claimValidators =
            overrideGlobalClaimValidators !== undefined
                ? await overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, userContext)
                : globalClaimValidators;
        let claimValidationResponse = await recipeImpl.validateClaims({
            userId: sessionInfo.userId,
            recipeUserId: sessionInfo.recipeUserId,
            accessTokenPayload: sessionInfo.customClaimsInAccessTokenPayload,
            claimValidators,
            userContext,
        });
        if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
            if (
                !(await recipeImpl.mergeIntoAccessTokenPayload({
                    sessionHandle,
                    accessTokenPayloadUpdate: claimValidationResponse.accessTokenPayloadUpdate,
                    userContext,
                }))
            ) {
                return {
                    status: "SESSION_DOES_NOT_EXIST_ERROR",
                };
            }
        }
        return {
            status: "OK",
            invalidClaims: claimValidationResponse.invalidClaims,
        };
    }
    static async getSession(req, res, options, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;
        return sessionRequestFunctions_1.getSessionFromRequest({
            req,
            res,
            recipeInterfaceImpl,
            config,
            options,
            userContext, // userContext is normalized inside the function
        });
    }
    static async getSessionWithoutRequestResponse(accessToken, antiCsrfToken, options, userContext = {}) {
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const session = await recipeInterfaceImpl.getSession({
            accessToken,
            antiCsrfToken,
            options,
            userContext,
        });
        if (session !== undefined) {
            const claimValidators = await utils_1.getRequiredClaimValidators(
                session,
                options === null || options === void 0 ? void 0 : options.overrideGlobalClaimValidators,
                userContext
            );
            await session.assertClaims(claimValidators, userContext);
        }
        return session;
    }
    static getSessionInformation(sessionHandle, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
    }
    static refreshSession(req, res, userContext = {}) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;
        return sessionRequestFunctions_1.refreshSessionInRequest({
            res,
            req,
            userContext,
            config,
            recipeInterfaceImpl,
        });
    }
    static refreshSessionWithoutRequestResponse(
        refreshToken,
        disableAntiCsrf = false,
        antiCsrfToken,
        userContext = {}
    ) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({
            refreshToken,
            disableAntiCsrf,
            antiCsrfToken,
            userContext,
        });
    }
    static revokeAllSessionsForUser(userId, revokeSessionsForLinkedAccounts = true, tenantId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({
            userId,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            revokeSessionsForLinkedAccounts,
            userContext,
        });
    }
    static getAllSessionHandlesForUser(userId, fetchSessionsForAllLinkedAccounts = true, tenantId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
            userId,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            fetchAcrossAllTenants: tenantId === undefined,
            fetchSessionsForAllLinkedAccounts,
            userContext,
        });
    }
    static revokeSession(sessionHandle, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({
            sessionHandle,
            userContext,
        });
    }
    static revokeMultipleSessions(sessionHandles, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
            sessionHandles,
            userContext,
        });
    }
    static updateSessionDataInDatabase(sessionHandle, newSessionData, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionDataInDatabase({
            sessionHandle,
            newSessionData,
            userContext,
        });
    }
    static mergeIntoAccessTokenPayload(sessionHandle, accessTokenPayloadUpdate, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.mergeIntoAccessTokenPayload({
            sessionHandle,
            accessTokenPayloadUpdate,
            userContext,
        });
    }
    static createJWT(payload, validitySeconds, useStaticSigningKey, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().openIdRecipe.recipeImplementation.createJWT({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext,
        });
    }
    static getJWKS(userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().openIdRecipe.recipeImplementation.getJWKS({ userContext });
    }
    static getOpenIdDiscoveryConfiguration(userContext = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({
                userContext,
            });
    }
    static fetchAndSetClaim(sessionHandle, claim, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.fetchAndSetClaim({
            sessionHandle,
            claim,
            userContext,
        });
    }
    static setClaimValue(sessionHandle, claim, value, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.setClaimValue({
            sessionHandle,
            claim,
            value,
            userContext,
        });
    }
    static getClaimValue(sessionHandle, claim, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getClaimValue({
            sessionHandle,
            claim,
            userContext,
        });
    }
    static removeClaim(sessionHandle, claim, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeClaim({
            sessionHandle,
            claim,
            userContext,
        });
    }
}
exports.default = SessionWrapper;
SessionWrapper.init = recipe_1.default.init;
SessionWrapper.Error = error_1.default;
exports.init = SessionWrapper.init;
exports.createNewSession = SessionWrapper.createNewSession;
exports.createNewSessionWithoutRequestResponse = SessionWrapper.createNewSessionWithoutRequestResponse;
exports.getSession = SessionWrapper.getSession;
exports.getSessionWithoutRequestResponse = SessionWrapper.getSessionWithoutRequestResponse;
exports.getSessionInformation = SessionWrapper.getSessionInformation;
exports.refreshSession = SessionWrapper.refreshSession;
exports.refreshSessionWithoutRequestResponse = SessionWrapper.refreshSessionWithoutRequestResponse;
exports.revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;
exports.getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;
exports.revokeSession = SessionWrapper.revokeSession;
exports.revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;
exports.updateSessionDataInDatabase = SessionWrapper.updateSessionDataInDatabase;
exports.mergeIntoAccessTokenPayload = SessionWrapper.mergeIntoAccessTokenPayload;
exports.fetchAndSetClaim = SessionWrapper.fetchAndSetClaim;
exports.setClaimValue = SessionWrapper.setClaimValue;
exports.getClaimValue = SessionWrapper.getClaimValue;
exports.removeClaim = SessionWrapper.removeClaim;
exports.validateClaimsForSessionHandle = SessionWrapper.validateClaimsForSessionHandle;
exports.Error = SessionWrapper.Error;
// JWT Functions
exports.createJWT = SessionWrapper.createJWT;
exports.getJWKS = SessionWrapper.getJWKS;
// Open id functions
exports.getOpenIdDiscoveryConfiguration = SessionWrapper.getOpenIdDiscoveryConfiguration;
