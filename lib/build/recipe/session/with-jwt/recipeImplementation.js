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
const constants_1 = require("./constants");
const sessionClass_1 = require("./sessionClass");
const assert = require("assert");
const utils_1 = require("./utils");
// Time difference between JWT expiry and access token expiry (JWT expiry = access token expiry + EXPIRY_OFFSET_SECONDS)
let EXPIRY_OFFSET_SECONDS = 30;
// This function should only be used during testing
function setJWTExpiryOffsetSecondsForTesting(offset) {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("calling testing function in non testing env");
    }
    EXPIRY_OFFSET_SECONDS = offset;
}
exports.setJWTExpiryOffsetSecondsForTesting = setJWTExpiryOffsetSecondsForTesting;
function default_1(originalImplementation, openIdRecipeImplementation, config) {
    function getJWTExpiry(accessTokenExpiry) {
        return accessTokenExpiry + EXPIRY_OFFSET_SECONDS;
    }
    return Object.assign(Object.assign({}, originalImplementation), {
        createNewSession: function ({ res, userId, accessTokenPayload, sessionData, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                accessTokenPayload =
                    accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
                let accessTokenValidityInSeconds = Math.ceil(
                    (yield this.getAccessTokenLifeTimeMS({ userContext })) / 1000
                );
                accessTokenPayload = yield utils_1.addJWTToAccessTokenPayload({
                    accessTokenPayload,
                    jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                    userId,
                    jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                    openIdRecipeImplementation,
                    userContext,
                });
                let sessionContainer = yield originalImplementation.createNewSession({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                    userContext,
                });
                return new sessionClass_1.default(sessionContainer, openIdRecipeImplementation);
            });
        },
        getSession: function ({ req, res, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let sessionContainer = yield originalImplementation.getSession({ req, res, options, userContext });
                if (sessionContainer === undefined) {
                    return undefined;
                }
                return new sessionClass_1.default(sessionContainer, openIdRecipeImplementation);
            });
        },
        refreshSession: function ({ req, res, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = Math.ceil(
                    (yield this.getAccessTokenLifeTimeMS({ userContext })) / 1000
                );
                // Refresh session first because this will create a new access token
                let newSession = yield originalImplementation.refreshSession({ req, res, userContext });
                let accessTokenPayload = newSession.getAccessTokenPayload();
                accessTokenPayload = yield utils_1.addJWTToAccessTokenPayload({
                    accessTokenPayload,
                    jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                    userId: newSession.getUserId(),
                    jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                    openIdRecipeImplementation,
                    userContext,
                });
                yield newSession.updateAccessTokenPayload(accessTokenPayload);
                return new sessionClass_1.default(newSession, openIdRecipeImplementation);
            });
        },
        updateAccessTokenPayload: function ({ sessionHandle, newAccessTokenPayload, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                newAccessTokenPayload =
                    newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
                let sessionInformation = yield this.getSessionInformation({ sessionHandle, userContext });
                if (sessionInformation === undefined) {
                    return false;
                }
                let accessTokenPayload = sessionInformation.accessTokenPayload;
                let existingJwtPropertyName =
                    accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
                if (existingJwtPropertyName === undefined) {
                    return yield originalImplementation.updateAccessTokenPayload({
                        sessionHandle,
                        newAccessTokenPayload,
                        userContext,
                    });
                }
                let existingJwt = accessTokenPayload[existingJwtPropertyName];
                assert.notStrictEqual(existingJwt, undefined);
                let currentTimeInSeconds = Date.now() / 1000;
                let decodedPayload = JsonWebToken.decode(existingJwt, { json: true });
                // JsonWebToken.decode possibly returns null
                if (decodedPayload === null) {
                    throw new Error("Error reading JWT from session");
                }
                let jwtExpiry = decodedPayload.exp - currentTimeInSeconds;
                if (jwtExpiry <= 0) {
                    // it can come here if someone calls this function well after
                    // the access token and the jwt payload have expired. In this case,
                    // we still want the jwt payload to update, but the resulting JWT should
                    // not be alive for too long (since it's expired already). So we set it to
                    // 1 second lifetime.
                    jwtExpiry = 1;
                }
                newAccessTokenPayload = yield utils_1.addJWTToAccessTokenPayload({
                    accessTokenPayload: newAccessTokenPayload,
                    jwtExpiry,
                    userId: sessionInformation.userId,
                    jwtPropertyName: existingJwtPropertyName,
                    openIdRecipeImplementation,
                    userContext,
                });
                return yield originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                    userContext,
                });
            });
        },
    });
}
exports.default = default_1;
