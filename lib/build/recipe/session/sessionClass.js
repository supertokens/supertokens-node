"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
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
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = __importDefault(require("./error"));
const utils_1 = require("./utils");
const jwt_1 = require("./jwt");
const logger_1 = require("../../logger");
const constants_1 = require("./constants");
const utils_2 = require("../../utils");
class Session {
    constructor(
        helpers,
        accessToken,
        frontToken,
        refreshToken,
        antiCsrfToken,
        sessionHandle,
        userId,
        recipeUserId,
        userDataInAccessToken,
        reqResInfo,
        accessTokenUpdated,
        tenantId
    ) {
        this.helpers = helpers;
        this.accessToken = accessToken;
        this.frontToken = frontToken;
        this.refreshToken = refreshToken;
        this.antiCsrfToken = antiCsrfToken;
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.recipeUserId = recipeUserId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.reqResInfo = reqResInfo;
        this.accessTokenUpdated = accessTokenUpdated;
        this.tenantId = tenantId;
    }
    getRecipeUserId(_userContext) {
        return this.recipeUserId;
    }
    async revokeSession(userContext) {
        await this.helpers.getRecipeImpl().revokeSession({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (this.reqResInfo !== undefined) {
            // we do not check the output of calling revokeSession
            // before clearing the cookies because we are revoking the
            // current API request's session.
            // If we instead clear the cookies only when revokeSession
            // returns true, it can cause this kind of a bug:
            // https://github.com/supertokens/supertokens-node/issues/343
            cookieAndHeaders_1.clearSession(
                this.helpers.config,
                this.reqResInfo.res,
                this.reqResInfo.transferMethod,
                this.reqResInfo.req,
                userContext === undefined ? utils_2.makeDefaultUserContextFromAPI(this.reqResInfo.req) : userContext
            );
        }
    }
    async getSessionDataFromDatabase(userContext) {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            logger_1.logDebugMessage(
                "getSessionDataFromDatabase: Throwing UNAUTHORISED because session does not exist anymore"
            );
            throw new error_1.default({
                message: "Session does not exist anymore",
                type: error_1.default.UNAUTHORISED,
            });
        }
        return sessionInfo.sessionDataInDatabase;
    }
    async updateSessionDataInDatabase(newSessionData, userContext) {
        if (
            !(await this.helpers.getRecipeImpl().updateSessionDataInDatabase({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: userContext === undefined ? {} : userContext,
            }))
        ) {
            logger_1.logDebugMessage(
                "updateSessionDataInDatabase: Throwing UNAUTHORISED because session does not exist anymore"
            );
            throw new error_1.default({
                message: "Session does not exist anymore",
                type: error_1.default.UNAUTHORISED,
            });
        }
    }
    getUserId(_userContext) {
        return this.userId;
    }
    getTenantId(_userContext) {
        return this.tenantId;
    }
    getAccessTokenPayload(_userContext) {
        return this.userDataInAccessToken;
    }
    getHandle() {
        return this.sessionHandle;
    }
    getAccessToken() {
        return this.accessToken;
    }
    getAllSessionTokensDangerously() {
        var _a;
        return {
            accessToken: this.accessToken,
            accessAndFrontTokenUpdated: this.accessTokenUpdated,
            refreshToken: (_a = this.refreshToken) === null || _a === void 0 ? void 0 : _a.token,
            frontToken: this.frontToken,
            antiCsrfToken: this.antiCsrfToken,
        };
    }
    // Any update to this function should also be reflected in the respective JWT version
    async mergeIntoAccessTokenPayload(accessTokenPayloadUpdate, userContext) {
        let newAccessTokenPayload = Object.assign({}, this.getAccessTokenPayload(userContext));
        for (const key of constants_1.protectedProps) {
            delete newAccessTokenPayload[key];
        }
        newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), accessTokenPayloadUpdate);
        for (const key of Object.keys(accessTokenPayloadUpdate)) {
            if (accessTokenPayloadUpdate[key] === null) {
                delete newAccessTokenPayload[key];
            }
        }
        let response = await this.helpers.getRecipeImpl().regenerateAccessToken({
            accessToken: this.getAccessToken(),
            newAccessTokenPayload,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (response === undefined) {
            logger_1.logDebugMessage(
                "mergeIntoAccessTokenPayload: Throwing UNAUTHORISED because session does not exist anymore"
            );
            throw new error_1.default({
                message: "Session does not exist anymore",
                type: error_1.default.UNAUTHORISED,
            });
        }
        if (response.accessToken !== undefined) {
            const respToken = jwt_1.parseJWTWithoutSignatureVerification(response.accessToken.token);
            const payload = respToken.version < 3 ? response.session.userDataInJWT : respToken.payload;
            this.userDataInAccessToken = payload;
            this.accessToken = response.accessToken.token;
            this.frontToken = cookieAndHeaders_1.buildFrontToken(this.userId, response.accessToken.expiry, payload);
            this.accessTokenUpdated = true;
            if (this.reqResInfo !== undefined) {
                // We need to cast to let TS know that the accessToken in the response is defined (and we don't overwrite it with undefined)
                utils_1.setAccessTokenInResponse(
                    this.reqResInfo.res,
                    this.accessToken,
                    this.frontToken,
                    this.helpers.config,
                    this.reqResInfo.transferMethod,
                    this.reqResInfo.req,
                    userContext === undefined ? utils_2.makeDefaultUserContextFromAPI(this.reqResInfo.req) : userContext
                );
            }
        } else {
            // This case means that the access token has expired between the validation and this update
            // We can't update the access token on the FE, as it will need to call refresh anyway but we handle this as a successful update during this request.
            // the changes will be reflected on the FE after refresh is called
            this.userDataInAccessToken = Object.assign(
                Object.assign({}, this.getAccessTokenPayload()),
                response.session.userDataInJWT
            );
        }
    }
    async getTimeCreated(userContext) {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            logger_1.logDebugMessage("getTimeCreated: Throwing UNAUTHORISED because session does not exist anymore");
            throw new error_1.default({
                message: "Session does not exist anymore",
                type: error_1.default.UNAUTHORISED,
            });
        }
        return sessionInfo.timeCreated;
    }
    async getExpiry(userContext) {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            logger_1.logDebugMessage("getExpiry: Throwing UNAUTHORISED because session does not exist anymore");
            throw new error_1.default({
                message: "Session does not exist anymore",
                type: error_1.default.UNAUTHORISED,
            });
        }
        return sessionInfo.expiry;
    }
    // Any update to this function should also be reflected in the respective JWT version
    async assertClaims(claimValidators, userContext) {
        let validateClaimResponse = await this.helpers.getRecipeImpl().validateClaims({
            accessTokenPayload: this.getAccessTokenPayload(userContext),
            userId: this.getUserId(userContext),
            recipeUserId: this.getRecipeUserId(userContext),
            claimValidators,
            userContext,
        });
        if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
            for (const key of constants_1.protectedProps) {
                delete validateClaimResponse.accessTokenPayloadUpdate[key];
            }
            await this.mergeIntoAccessTokenPayload(validateClaimResponse.accessTokenPayloadUpdate, userContext);
        }
        if (validateClaimResponse.invalidClaims.length !== 0) {
            throw new error_1.default({
                type: "INVALID_CLAIMS",
                message: "INVALID_CLAIMS",
                payload: validateClaimResponse.invalidClaims,
            });
        }
    }
    // Any update to this function should also be reflected in the respective JWT version
    async fetchAndSetClaim(claim, userContext) {
        const update = await claim.build(
            this.getUserId(userContext),
            this.getRecipeUserId(userContext),
            this.getTenantId(),
            userContext
        );
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    // Any update to this function should also be reflected in the respective JWT version
    setClaimValue(claim, value, userContext) {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    // Any update to this function should also be reflected in the respective JWT version
    async getClaimValue(claim, userContext) {
        return claim.getValueFromPayload(await this.getAccessTokenPayload(userContext), userContext);
    }
    // Any update to this function should also be reflected in the respective JWT version
    removeClaim(claim, userContext) {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    attachToRequestResponse(info, userContext) {
        this.reqResInfo = info;
        if (this.accessTokenUpdated) {
            const { res, transferMethod } = info;
            utils_1.setAccessTokenInResponse(
                res,
                this.accessToken,
                this.frontToken,
                this.helpers.config,
                transferMethod,
                info.req,
                userContext !== undefined ? userContext : utils_2.makeDefaultUserContextFromAPI(info.req)
            );
            if (this.refreshToken !== undefined) {
                cookieAndHeaders_1.setToken(
                    this.helpers.config,
                    res,
                    "refresh",
                    this.refreshToken.token,
                    this.refreshToken.expiry,
                    transferMethod,
                    info.req,
                    userContext !== undefined ? userContext : utils_2.makeDefaultUserContextFromAPI(info.req)
                );
            }
            if (this.antiCsrfToken !== undefined) {
                cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, this.antiCsrfToken);
            }
        }
    }
}
exports.default = Session;
