"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const accessToken_1 = require("./accessToken");
const error_1 = require("./error");
const processState_1 = require("../../processState");
const normalisedURLPath_1 = require("../../normalisedURLPath");
/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
function createNewSession(recipeInstance, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session"), {
            userId,
            userDataInJWT: jwtPayload,
            userDataInDatabase: sessionData,
        });
        recipeInstance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        // we check if sameSite is none, antiCsrfTokens is being sent - this is a security check
        if (recipeInstance.config.cookieSameSite === "none" && response.antiCsrfToken === undefined) {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error('Security error: Cookie same site is "none" and anti-CSRF protection is disabled! Please either: \n- Change cookie same site to "lax" or to "strict". or \n- Enable anti-CSRF protection in the core by setting enable_anti_csrf to true.'),
            }, recipeInstance.getRecipeId());
        }
        return response;
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
function getSession(recipeInstance, accessToken, antiCsrfToken, doAntiCsrfCheck) {
    return __awaiter(this, void 0, void 0, function* () {
        let handShakeInfo = yield recipeInstance.getHandshakeInfo();
        try {
            if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
                let accessTokenInfo = yield accessToken_1.getInfoFromAccessToken(recipeInstance, accessToken, handShakeInfo.jwtSigningPublicKey, handShakeInfo.enableAntiCsrf && doAntiCsrfCheck);
                let sessionHandle = accessTokenInfo.sessionHandle;
                // anti-csrf check
                if (handShakeInfo.enableAntiCsrf &&
                    doAntiCsrfCheck &&
                    (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken)) {
                    if (antiCsrfToken === undefined) {
                        throw new error_1.default({
                            message: "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        }, recipeInstance.getRecipeId());
                    }
                    else {
                        throw new error_1.default({
                            message: "anti-csrf check failed",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        }, recipeInstance.getRecipeId());
                    }
                }
                if (!handShakeInfo.accessTokenBlacklistingEnabled &&
                    accessTokenInfo.parentRefreshTokenHash1 === undefined) {
                    return {
                        session: {
                            handle: accessTokenInfo.sessionHandle,
                            userId: accessTokenInfo.userId,
                            userDataInJWT: accessTokenInfo.userData,
                        },
                    };
                }
            }
        }
        catch (err) {
            if (err.type !== error_1.default.TRY_REFRESH_TOKEN) {
                // if error is try refresh token, we call the actual API.
                throw err;
            }
        }
        processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/verify"), {
            accessToken,
            antiCsrfToken,
            doAntiCsrfCheck,
        });
        if (response.status == "OK") {
            recipeInstance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
            delete response.status;
            delete response.jwtSigningPublicKey;
            delete response.jwtSigningPublicKeyExpiryTime;
            return response;
        }
        else if (response.status == "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
        else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.TRY_REFRESH_TOKEN,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.getSession = getSession;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
function refreshSession(recipeInstance, refreshToken, antiCsrfToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/refresh"), {
            refreshToken,
            antiCsrfToken,
        });
        if (response.status == "OK") {
            delete response.status;
            return response;
        }
        else if (response.status == "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
        else {
            throw new error_1.default({
                message: "Token theft detected",
                payload: {
                    userId: response.session.userId,
                    sessionHandle: response.session.handle,
                },
                type: error_1.default.TOKEN_THEFT_DETECTED,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.refreshSession = refreshSession;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a bloacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
function revokeAllSessionsForUser(recipeInstance, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/remove"), {
            userId,
        });
        return response.sessionHandlesRevoked;
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
function getAllSessionHandlesForUser(recipeInstance, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/user"), {
            userId,
        });
        return response.sessionHandles;
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
function revokeSession(recipeInstance, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/remove"), {
            sessionHandles: [sessionHandle],
        });
        return response.sessionHandlesRevoked.length === 1;
    });
}
exports.revokeSession = revokeSession;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
function revokeMultipleSessions(recipeInstance, sessionHandles) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/remove"), {
            sessionHandles,
        });
        return response.sessionHandlesRevoked;
    });
}
exports.revokeMultipleSessions = revokeMultipleSessions;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getSessionData(recipeInstance, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/data"), {
            sessionHandle,
        });
        if (response.status === "OK") {
            return response.userDataInDatabase;
        }
        else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateSessionData(recipeInstance, sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPutRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/session/data"), {
            sessionHandle,
            userDataInDatabase: newSessionData,
        });
        if (response.status === "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.updateSessionData = updateSessionData;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getJWTPayload(recipeInstance, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/jwt/data"), {
            sessionHandle,
        });
        if (response.status === "OK") {
            return response.userDataInJWT;
        }
        else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.getJWTPayload = getJWTPayload;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateJWTPayload(recipeInstance, sessionHandle, newJWTPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPutRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/jwt/data"), {
            sessionHandle,
            userDataInJWT: newJWTPayload,
        });
        if (response.status === "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            }, recipeInstance.getRecipeId());
        }
    });
}
exports.updateJWTPayload = updateJWTPayload;
//# sourceMappingURL=sessionFunctions.js.map