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
// For Express
class SessionWrapper {
    static createNewSession(res, userId, accessTokenPayload = {}, sessionData = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            res,
            userId,
            accessTokenPayload,
            sessionData,
        });
    }
    static getSession(req, res, options) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSession({ req, res, options });
    }
    static getSessionInformation(sessionHandle) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({ sessionHandle });
    }
    static refreshSession(req, res) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({ req, res });
    }
    static revokeAllSessionsForUser(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({ userId });
    }
    static getAllSessionHandlesForUser(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({ userId });
    }
    static revokeSession(sessionHandle) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({ sessionHandle });
    }
    static revokeMultipleSessions(sessionHandles) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeMultipleSessions({ sessionHandles });
    }
    static updateSessionData(sessionHandle, newSessionData) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionData({
            sessionHandle,
            newSessionData,
        });
    }
    static updateAccessTokenPayload(sessionHandle, newAccessTokenPayload) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateAccessTokenPayload({
            sessionHandle,
            newAccessTokenPayload,
        });
    }
    static createJWT(payload, validitySeconds) {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.createJWT({ payload, validitySeconds });
        }
        throw new global.Error(
            "createJWT cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }
    static getJWKS() {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getJWKS();
        }
        throw new global.Error(
            "getJWKS cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }
    static getOpenIdDiscoveryConfiguration() {
        let openIdRecipe = recipe_1.default.getInstanceOrThrowError().openIdRecipe;
        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration();
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
