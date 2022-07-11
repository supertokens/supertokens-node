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
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const recipe_1 = require("./recipe");
const framework_1 = require("../../framework");
const supertokens_1 = require("../../supertokens");
// For Express
class SessionWrapper {
    static createNewSession(res, userId, accessTokenPayload = {}, sessionData = {}, userContext = {}) {
        if (!res.wrapperUsed) {
            res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            res,
            userId,
            accessTokenPayload,
            sessionData,
            userContext,
        });
    }
    static getSession(req, res, options, userContext = {}) {
        if (!res.wrapperUsed) {
            res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getSession({ req, res, options, userContext });
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
exports.Error = SessionWrapper.Error;
// JWT Functions
exports.createJWT = SessionWrapper.createJWT;
exports.getJWKS = SessionWrapper.getJWKS;
// Open id functions
exports.getOpenIdDiscoveryConfiguration = SessionWrapper.getOpenIdDiscoveryConfiguration;
