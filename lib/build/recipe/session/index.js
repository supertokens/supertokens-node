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
exports.getOpenIdDiscoveryConfiguration =
    exports.getJWKS =
    exports.createJWT =
    exports.Error =
    exports.validateClaimsForSessionHandle =
    exports.removeClaim =
    exports.getClaimValue =
    exports.setClaimValue =
    exports.fetchAndSetClaim =
    exports.mergeIntoAccessTokenPayload =
    exports.updateSessionDataInDatabase =
    exports.revokeMultipleSessions =
    exports.revokeSession =
    exports.getAllSessionHandlesForUser =
    exports.revokeAllSessionsForUser =
    exports.refreshSessionWithoutRequestResponse =
    exports.refreshSession =
    exports.getSessionInformation =
    exports.getSessionWithoutRequestResponse =
    exports.getSession =
    exports.createNewSessionWithoutRequestResponse =
    exports.createNewSession =
    exports.init =
        void 0;
const error_1 = __importDefault(require("./error"));
const recipe_1 = __importDefault(require("./recipe"));
const recipe_2 = __importDefault(require("../openid/recipe"));
const recipe_3 = __importDefault(require("../jwt/recipe"));
const utils_1 = require("./utils");
const sessionRequestFunctions_1 = require("./sessionRequestFunctions");
const __1 = require("../..");
const constants_1 = require("../multitenancy/constants");
const constants_2 = require("./constants");
const utils_2 = require("../../utils");
class SessionWrapper {
    static async createNewSession(
        req,
        res,
        tenantId,
        recipeUserId,
        accessTokenPayload = {},
        sessionDataInDatabase = {},
        userContext
    ) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const appInfo = recipeInstance.getAppInfo();
        let user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }
        return await (0, sessionRequestFunctions_1.createNewSessionInRequest)({
            req,
            res,
            userContext: (0, utils_2.getUserContext)(userContext),
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
        userContext
    ) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
        const issuer = await recipe_2.default.getIssuer(ctx);
        let finalAccessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { iss: issuer });
        for (const prop of constants_2.protectedProps) {
            delete finalAccessTokenPayload[prop];
        }
        let user = await (0, __1.getUser)(recipeUserId.getAsString(), ctx);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }
        for (const claim of claimsAddedByOtherRecipes) {
            const update = await claim.build(userId, recipeUserId, tenantId, finalAccessTokenPayload, ctx);
            finalAccessTokenPayload = Object.assign(Object.assign({}, finalAccessTokenPayload), update);
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            userId,
            recipeUserId,
            accessTokenPayload: finalAccessTokenPayload,
            sessionDataInDatabase,
            disableAntiCsrf,
            tenantId,
            userContext: ctx,
        });
    }
    static async validateClaimsForSessionHandle(sessionHandle, overrideGlobalClaimValidators, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const sessionInfo = await recipeImpl.getSessionInformation({
            sessionHandle,
            userContext: ctx,
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
            userContext: ctx,
        });
        const claimValidators =
            overrideGlobalClaimValidators !== undefined
                ? await overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, ctx)
                : globalClaimValidators;
        let claimValidationResponse = await recipeImpl.validateClaims({
            userId: sessionInfo.userId,
            recipeUserId: sessionInfo.recipeUserId,
            accessTokenPayload: sessionInfo.customClaimsInAccessTokenPayload,
            claimValidators,
            userContext: ctx,
        });
        if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
            if (
                !(await recipeImpl.mergeIntoAccessTokenPayload({
                    sessionHandle,
                    accessTokenPayloadUpdate: claimValidationResponse.accessTokenPayloadUpdate,
                    userContext: ctx,
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
        return (0, sessionRequestFunctions_1.getSessionFromRequest)({
            req,
            res,
            recipeInterfaceImpl,
            config,
            options,
            userContext: (0, utils_2.getUserContext)(userContext), // userContext is normalized inside the function
        });
    }
    static async getSessionWithoutRequestResponse(accessToken, antiCsrfToken, options, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
        const session = await recipeInterfaceImpl.getSession({
            accessToken,
            antiCsrfToken,
            options,
            userContext: ctx,
        });
        if (session !== undefined) {
            const claimValidators = await (0, utils_1.getRequiredClaimValidators)(
                session,
                options === null || options === void 0 ? void 0 : options.overrideGlobalClaimValidators,
                ctx
            );
            await session.assertClaims(claimValidators, ctx);
        }
        return session;
    }
    static getSessionInformation(sessionHandle, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static refreshSession(req, res, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;
        return (0, sessionRequestFunctions_1.refreshSessionInRequest)({
            res,
            req,
            userContext: (0, utils_2.getUserContext)(userContext),
            config,
            recipeInterfaceImpl,
        });
    }
    static refreshSessionWithoutRequestResponse(refreshToken, disableAntiCsrf = false, antiCsrfToken, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({
            refreshToken,
            disableAntiCsrf,
            antiCsrfToken,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static revokeAllSessionsForUser(userId, revokeSessionsForLinkedAccounts = true, tenantId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({
            userId,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            revokeAcrossAllTenants: tenantId === undefined,
            revokeSessionsForLinkedAccounts,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static getAllSessionHandlesForUser(userId, fetchSessionsForAllLinkedAccounts = true, tenantId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
            userId,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            fetchAcrossAllTenants: tenantId === undefined,
            fetchSessionsForAllLinkedAccounts,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static revokeSession(sessionHandle, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({
            sessionHandle,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static revokeMultipleSessions(sessionHandles, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
            sessionHandles,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static updateSessionDataInDatabase(sessionHandle, newSessionData, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionDataInDatabase({
            sessionHandle,
            newSessionData,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static mergeIntoAccessTokenPayload(sessionHandle, accessTokenPayloadUpdate, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.mergeIntoAccessTokenPayload({
            sessionHandle,
            accessTokenPayloadUpdate,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static createJWT(payload, validitySeconds, useStaticSigningKey, userContext) {
        return recipe_2.default.getInstanceOrThrowError().recipeImplementation.createJWT({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static getJWKS(userContext) {
        return recipe_3.default.getInstanceOrThrowError().recipeInterfaceImpl.getJWKS({
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static getOpenIdDiscoveryConfiguration(userContext) {
        return recipe_2.default.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static fetchAndSetClaim(sessionHandle, claim, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.fetchAndSetClaim({
            sessionHandle,
            claim,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static setClaimValue(sessionHandle, claim, value, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.setClaimValue({
            sessionHandle,
            claim,
            value,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static getClaimValue(sessionHandle, claim, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getClaimValue({
            sessionHandle,
            claim,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static removeClaim(sessionHandle, claim, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeClaim({
            sessionHandle,
            claim,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
}
SessionWrapper.init = recipe_1.default.init;
SessionWrapper.Error = error_1.default;
exports.default = SessionWrapper;
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
