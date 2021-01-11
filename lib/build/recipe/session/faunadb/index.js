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
const sessionRecipe_1 = require("./sessionRecipe");
const error_1 = require("../error");
const sessionClass_1 = require("./sessionClass");
const middleware_1 = require("../middleware");
// For Express
class SessionWrapper {
    static createNewSession(res, userId, jwtPayload = {}, sessionData = {}) {
        return sessionRecipe_1.default
            .getInstanceOrThrowError()
            .parentRecipe.createNewSession(res, userId, jwtPayload, sessionData);
    }
    static getSession(req, res, doAntiCsrfCheck) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.getSession(req, res, doAntiCsrfCheck);
    }
    static refreshSession(req, res) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.refreshSession(req, res);
    }
    static revokeAllSessionsForUser(userId) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.revokeAllSessionsForUser(userId);
    }
    static getAllSessionHandlesForUser(userId) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.getAllSessionHandlesForUser(userId);
    }
    static revokeSession(sessionHandle) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.revokeSession(sessionHandle);
    }
    static revokeMultipleSessions(sessionHandles) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.revokeMultipleSessions(sessionHandles);
    }
    static getSessionData(sessionHandle) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.getSessionData(sessionHandle);
    }
    static updateSessionData(sessionHandle, newSessionData) {
        return sessionRecipe_1.default
            .getInstanceOrThrowError()
            .parentRecipe.updateSessionData(sessionHandle, newSessionData);
    }
    static getJWTPayload(sessionHandle) {
        return sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe.getJWTPayload(sessionHandle);
    }
    static updateJWTPayload(sessionHandle, newJWTPayload) {
        return sessionRecipe_1.default
            .getInstanceOrThrowError()
            .parentRecipe.updateJWTPayload(sessionHandle, newJWTPayload);
    }
}
exports.default = SessionWrapper;
SessionWrapper.init = sessionRecipe_1.default.init;
SessionWrapper.Error = error_1.default;
SessionWrapper.SessionContainer = sessionClass_1.default;
SessionWrapper.verifySession = (antiCsrfCheck) => {
    return middleware_1.verifySession(sessionRecipe_1.default.getInstanceOrThrowError().parentRecipe, antiCsrfCheck);
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
exports.SessionContainer = SessionWrapper.SessionContainer;
//# sourceMappingURL=index.js.map
