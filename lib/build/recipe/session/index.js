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
const error_1 = require("./error");
const recipe_1 = require("./recipe");
const framework_1 = require("../../framework");
const supertokens_1 = require("../../supertokens");
const utils_1 = require("./utils");
// For Express
class SessionWrapper {
    static createNewSession(res, userId, accessTokenPayload = {}, sessionData = {}, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const claimsAddedByOtherRecipes = recipe_1.default.getInstanceOrThrowError().getClaimsAddedByOtherRecipes();
            let finalAccessTokenPayload = accessTokenPayload;
            for (const claim of claimsAddedByOtherRecipes) {
                const update = yield claim.build(userId, userContext);
                finalAccessTokenPayload = Object.assign(Object.assign({}, finalAccessTokenPayload), update);
            }
            if (!res.wrapperUsed) {
                res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(res);
            }
            return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
                res,
                userId,
                accessTokenPayload: finalAccessTokenPayload,
                sessionData,
                userContext,
            });
        });
    }
    static validateClaimsForSessionHandle(sessionHandle, overrideGlobalClaimValidators, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
            const sessionInfo = yield recipeImpl.getSessionInformation({
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
            const globalClaimValidators = yield recipeImpl.getGlobalClaimValidators({
                userId: sessionInfo === null || sessionInfo === void 0 ? void 0 : sessionInfo.userId,
                claimValidatorsAddedByOtherRecipes,
                userContext,
            });
            const claimValidators =
                overrideGlobalClaimValidators !== undefined
                    ? yield overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, userContext)
                    : globalClaimValidators;
            let claimValidationResponse = yield recipeImpl.validateClaims({
                userId: sessionInfo.userId,
                accessTokenPayload: sessionInfo.accessTokenPayload,
                claimValidators,
                userContext,
            });
            if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
                if (
                    !(yield recipeImpl.mergeIntoAccessTokenPayload({
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
        });
    }
    static validateClaimsInJWTPayload(userId, jwtPayload, overrideGlobalClaimValidators, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
            const claimValidatorsAddedByOtherRecipes = recipe_1.default
                .getInstanceOrThrowError()
                .getClaimValidatorsAddedByOtherRecipes();
            const globalClaimValidators = yield recipeImpl.getGlobalClaimValidators({
                userId,
                claimValidatorsAddedByOtherRecipes,
                userContext,
            });
            const claimValidators =
                overrideGlobalClaimValidators !== undefined
                    ? yield overrideGlobalClaimValidators(globalClaimValidators, userId, userContext)
                    : globalClaimValidators;
            return recipeImpl.validateClaimsInJWTPayload({
                userId,
                jwtPayload,
                claimValidators,
                userContext,
            });
        });
    }
    static getSession(req, res, options, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!res.wrapperUsed) {
                res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(res);
            }
            if (!req.wrapperUsed) {
                req = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapRequest(req);
            }
            const recipeInterfaceImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
            const session = yield recipeInterfaceImpl.getSession({ req, res, options, userContext });
            if (session !== undefined) {
                const claimValidators = yield utils_1.getRequiredClaimValidators(
                    session,
                    options === null || options === void 0 ? void 0 : options.overrideGlobalClaimValidators,
                    userContext
                );
                yield session.assertClaims(claimValidators, userContext);
            }
            return session;
        });
    }
    static getSessionInformation(sessionHandle, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
    }
    static refreshSession(req, res, userContext = {}) {
        if (!res.wrapperUsed) {
            res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({ req, res, userContext });
    }
    static revokeAllSessionsForUser(userId, userContext = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeAllSessionsForUser({ userId, userContext });
    }
    static getAllSessionHandlesForUser(userId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
            userId,
            userContext,
        });
    }
    static revokeSession(sessionHandle, userContext = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeSession({ sessionHandle, userContext });
    }
    static revokeMultipleSessions(sessionHandles, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
            sessionHandles,
            userContext,
        });
    }
    static updateSessionData(sessionHandle, newSessionData, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionData({
            sessionHandle,
            newSessionData,
            userContext,
        });
    }
    static regenerateAccessToken(accessToken, newAccessTokenPayload, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.regenerateAccessToken({
            accessToken,
            newAccessTokenPayload,
            userContext,
        });
    }
    static updateAccessTokenPayload(sessionHandle, newAccessTokenPayload, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateAccessTokenPayload({
            sessionHandle,
            newAccessTokenPayload,
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
    static createJWT(payload, validitySeconds, userContext = {}) {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.createJWT({ payload, validitySeconds, userContext });
        }
        throw new global.Error(
            "createJWT cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }
    static getJWKS(userContext = {}) {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getJWKS({ userContext });
        }
        throw new global.Error(
            "getJWKS cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }
    static getOpenIdDiscoveryConfiguration(userContext = {}) {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext });
        }
        throw new global.Error(
            "getOpenIdDiscoveryConfiguration cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
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
exports.getSession = SessionWrapper.getSession;
exports.getSessionInformation = SessionWrapper.getSessionInformation;
exports.refreshSession = SessionWrapper.refreshSession;
exports.revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;
exports.getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;
exports.revokeSession = SessionWrapper.revokeSession;
exports.revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;
exports.updateSessionData = SessionWrapper.updateSessionData;
exports.updateAccessTokenPayload = SessionWrapper.updateAccessTokenPayload;
exports.mergeIntoAccessTokenPayload = SessionWrapper.mergeIntoAccessTokenPayload;
exports.fetchAndSetClaim = SessionWrapper.fetchAndSetClaim;
exports.setClaimValue = SessionWrapper.setClaimValue;
exports.getClaimValue = SessionWrapper.getClaimValue;
exports.removeClaim = SessionWrapper.removeClaim;
exports.validateClaimsInJWTPayload = SessionWrapper.validateClaimsInJWTPayload;
exports.validateClaimsForSessionHandle = SessionWrapper.validateClaimsForSessionHandle;
exports.Error = SessionWrapper.Error;
// JWT Functions
exports.createJWT = SessionWrapper.createJWT;
exports.getJWKS = SessionWrapper.getJWKS;
// Open id functions
exports.getOpenIdDiscoveryConfiguration = SessionWrapper.getOpenIdDiscoveryConfiguration;
