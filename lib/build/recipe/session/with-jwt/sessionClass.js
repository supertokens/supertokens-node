"use strict";
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
const JsonWebToken = require("jsonwebtoken");
const assert = require("assert");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
class SessionClassWithJWT {
    constructor(originalSessionClass, openIdRecipeImplementation) {
        this.revokeSession = (userContext) => {
            return this.originalSessionClass.revokeSession(userContext);
        };
        this.getSessionData = (userContext) => {
            return this.originalSessionClass.getSessionData(userContext);
        };
        this.updateSessionData = (newSessionData, userContext) => {
            return this.originalSessionClass.updateSessionData(newSessionData, userContext);
        };
        this.getUserId = (userContext) => {
            return this.originalSessionClass.getUserId(userContext);
        };
        this.getAccessTokenPayload = (userContext) => {
            return this.originalSessionClass.getAccessTokenPayload(userContext);
        };
        this.getHandle = (userContext) => {
            return this.originalSessionClass.getHandle(userContext);
        };
        this.getAccessToken = (userContext) => {
            return this.originalSessionClass.getAccessToken(userContext);
        };
        this.getTimeCreated = (userContext) => {
            return this.originalSessionClass.getTimeCreated(userContext);
        };
        this.getExpiry = (userContext) => {
            return this.originalSessionClass.getExpiry(userContext);
        };
        this.getSessionClaimPayload = (userContext) => {
            return this.originalSessionClass.getSessionClaimPayload(userContext);
        };
        // These are re-implemented here, because they can update the access token payload
        this.updateClaim = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.updateClaims([claim], userContext);
            });
        this.updateClaims = (claims, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const origSessionClaimPayloadJSON = JSON.stringify(this.getSessionClaimPayload());
                const origAccessTokenPayloadJSON = JSON.stringify(this.getAccessTokenPayload());
                let newSessionClaimPayload = this.getSessionClaimPayload();
                let newAccessTokenPayload = this.getAccessTokenPayload();
                for (const claim of claims) {
                    const value = yield claim.fetch(this.getUserId(), userContext);
                    if (value !== undefined) {
                        newSessionClaimPayload = claim.addToPayload(this.getSessionClaimPayload(), value, userContext);
                    }
                    if (claim.updateAccessTokenPayload) {
                        newAccessTokenPayload = claim.updateAccessTokenPayload(
                            this.getAccessTokenPayload(),
                            value,
                            userContext
                        );
                    }
                }
                const sessionClaimPayloadUpdate =
                    JSON.stringify(newSessionClaimPayload) !== origSessionClaimPayloadJSON
                        ? newSessionClaimPayload
                        : undefined;
                const accessTokenPayloadUpdate =
                    JSON.stringify(newAccessTokenPayload) !== origAccessTokenPayloadJSON
                        ? newAccessTokenPayload
                        : undefined;
                if (accessTokenPayloadUpdate !== undefined || sessionClaimPayloadUpdate !== undefined) {
                    yield this.regenerateToken(accessTokenPayloadUpdate, sessionClaimPayloadUpdate, userContext);
                }
            });
        this.checkClaimInToken = (claim, userContext) => {
            return claim.isValid(this.getSessionClaimPayload(), userContext);
        };
        this.addClaim = (claim, value, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const newSessionClaimPayload = claim.addToPayload(this.getSessionClaimPayload(), value, userContext);
                let newAccessTokenPayload;
                if (claim.updateAccessTokenPayload) {
                    newAccessTokenPayload = claim.updateAccessTokenPayload(
                        this.getAccessTokenPayload(),
                        value,
                        userContext
                    );
                }
                yield this.regenerateToken(newAccessTokenPayload, newSessionClaimPayload, userContext);
            });
        this.removeClaim = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const newSessionClaimPayload = claim.removeFromPayload(this.getSessionClaimPayload(), userContext);
                let newAccessTokenPayload;
                if (claim.updateAccessTokenPayload) {
                    newAccessTokenPayload = claim.updateAccessTokenPayload(
                        this.getAccessTokenPayload(),
                        undefined,
                        userContext
                    );
                }
                yield this.regenerateToken(newAccessTokenPayload, newSessionClaimPayload, userContext);
            });
        this.updateAccessTokenPayload = (newAccessTokenPayload, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.originalSessionClass.regenerateToken(newAccessTokenPayload, undefined, userContext);
            });
        this.regenerateToken = (newAccessTokenPayload, newClaimPayload, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                newAccessTokenPayload =
                    newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
                let accessTokenPayload = this.getAccessTokenPayload(userContext);
                let jwtPropertyName = accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
                if (jwtPropertyName === undefined) {
                    return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload, userContext);
                }
                let existingJWT = accessTokenPayload[jwtPropertyName];
                assert.notStrictEqual(existingJWT, undefined);
                let currentTimeInSeconds = Date.now() / 1000;
                let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });
                // JsonWebToken.decode possibly returns null
                if (decodedPayload === null) {
                    throw new Error("Error reading JWT from session");
                }
                let jwtExpiry = decodedPayload.exp - currentTimeInSeconds;
                if (jwtExpiry <= 0) {
                    // it can come here if someone calls this function well after
                    // the access token and the jwt payload have expired (which can happen if an API takes a VERY long time). In this case, we still want the jwt payload to update, but the resulting JWT should
                    // not be alive for too long (since it's expired already). So we set it to
                    // 1 second lifetime.
                    jwtExpiry = 1;
                }
                newAccessTokenPayload = yield utils_1.addJWTToAccessTokenPayload({
                    accessTokenPayload: newAccessTokenPayload,
                    jwtExpiry,
                    userId: this.getUserId(),
                    jwtPropertyName,
                    openIdRecipeImplementation: this.openIdRecipeImplementation,
                    userContext,
                });
                yield this.originalSessionClass.regenerateToken(newAccessTokenPayload, newClaimPayload, userContext);
            });
        this.openIdRecipeImplementation = openIdRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
    }
}
exports.default = SessionClassWithJWT;
