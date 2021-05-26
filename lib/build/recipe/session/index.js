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
const middleware_1 = require("./api/middleware");
const error_1 = require("./error");
const recipe_1 = require("./recipe");
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
// For Express
class SessionWrapper {
    static createNewSession(req, res, userId, jwtPayload = {}, sessionData = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createNewSession(req, res, userId, jwtPayload, sessionData);
    }
    static getSession(req, res, options) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSession(req, res, options);
    }
    static refreshSession(req, res) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession(req, res);
    }
    static revokeAllSessionsForUser(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser(userId);
    }
    static getAllSessionHandlesForUser(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser(userId);
    }
    static revokeSession(sessionHandle) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession(sessionHandle);
    }
    static revokeMultipleSessions(sessionHandles) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions(sessionHandles);
    }
    static getSessionData(sessionHandle) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getSessionData(sessionHandle);
    }
    static updateSessionData(sessionHandle, newSessionData) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateSessionData(sessionHandle, newSessionData);
    }
    static getJWTPayload(sessionHandle) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getJWTPayload(sessionHandle);
    }
    static updateJWTPayload(sessionHandle, newJWTPayload) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateJWTPayload(sessionHandle, newJWTPayload);
    }
}
exports.default = SessionWrapper;
SessionWrapper.init = recipe_1.default.init;
SessionWrapper.Error = error_1.default;
SessionWrapper.verifySession = (options) => {
    // We do not directly return originVerifySession func cause of
    // https://github.com/supertokens/supertokens-node/issues/122
    return (req, res, next) =>
        middleware_1.verifySession(recipe_1.default.getInstanceOrThrowError(), options)(req, res, next);
};
exports.init = SessionWrapper.init;
exports.createNewSession = SessionWrapper.createNewSession;
exports.getSession = SessionWrapper.getSession;
exports.refreshSession = SessionWrapper.refreshSession;
exports.revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;
exports.getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;
exports.revokeSession = SessionWrapper.revokeSession;
exports.revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;
exports.getSessionData = SessionWrapper.getSessionData;
exports.updateSessionData = SessionWrapper.updateSessionData;
exports.getJWTPayload = SessionWrapper.getJWTPayload;
exports.updateJWTPayload = SessionWrapper.updateJWTPayload;
exports.verifySession = SessionWrapper.verifySession;
exports.Error = SessionWrapper.Error;
//# sourceMappingURL=index.js.map
