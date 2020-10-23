"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const sessionRecipe_1 = require("./sessionRecipe");
const error_1 = require("../error");
__export(require("../error"));
__export(require("./sessionClass"));
const middleware_1 = require("../middleware");
// For Express
class SessionWrapper {}
exports.default = SessionWrapper;
SessionWrapper.init = sessionRecipe_1.default.init;
SessionWrapper.createNewSession = sessionRecipe_1.default.getInstanceOrThrowError().createNewSession;
SessionWrapper.getSession = sessionRecipe_1.default.getInstanceOrThrowError().getSession;
SessionWrapper.refreshSession = sessionRecipe_1.default.getInstanceOrThrowError().refreshSession;
SessionWrapper.revokeAllSessionsForUser = sessionRecipe_1.default.getInstanceOrThrowError().revokeAllSessionsForUser;
SessionWrapper.getAllSessionHandlesForUser = sessionRecipe_1.default.getInstanceOrThrowError().getAllSessionHandlesForUser;
SessionWrapper.revokeSession = sessionRecipe_1.default.getInstanceOrThrowError().revokeSession;
SessionWrapper.revokeMultipleSessions = sessionRecipe_1.default.getInstanceOrThrowError().revokeMultipleSessions;
SessionWrapper.getSessionData = sessionRecipe_1.default.getInstanceOrThrowError().getSessionData;
SessionWrapper.updateSessionData = sessionRecipe_1.default.getInstanceOrThrowError().updateSessionData;
SessionWrapper.getCORSAllowedHeaders = sessionRecipe_1.default.getInstanceOrThrowError().getCORSAllowedHeaders;
SessionWrapper.getJWTPayload = sessionRecipe_1.default.getInstanceOrThrowError().getJWTPayload;
SessionWrapper.updateJWTPayload = sessionRecipe_1.default.getInstanceOrThrowError().updateJWTPayload;
SessionWrapper.middleware = (antiCsrfCheck) => {
    return middleware_1.middleware(sessionRecipe_1.default.getInstanceOrThrowError(), antiCsrfCheck);
};
SessionWrapper.Error = error_1.default;
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
exports.getCORSAllowedHeaders = SessionWrapper.getCORSAllowedHeaders;
exports.getJWTPayload = SessionWrapper.getJWTPayload;
exports.updateJWTPayload = SessionWrapper.updateJWTPayload;
//# sourceMappingURL=index.js.map
