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
function default_1(originalImplementation, jwtRecipeImplementation, config, appInfo) {
    // Time difference between JWT expiry and access token expiry (JWT expiry = access token expiry + EXPIRY_OFFSET_SECONDS)
    const EXPIRY_OFFSET_SECONDS = 30;
    function getJWTExpiry(accessTokenExpiry) {
        return accessTokenExpiry + EXPIRY_OFFSET_SECONDS;
    }
    function modifyAccessTokenPayload({ accessTokenPayload, jwtExpiry, userId, jwtPropertyName }) {
        return __awaiter(this, void 0, void 0, function* () {
            // If jwtPropertyName is not undefined it means that the JWT was added to the access token payload already
            let existingJwtPropertyName = accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
            if (existingJwtPropertyName !== undefined) {
                // Delete the old JWT and the old property name
                delete accessTokenPayload[existingJwtPropertyName];
                delete accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
            }
            // Update the access token payload with the default claims to add
            accessTokenPayload = Object.assign(
                {
                    /*
                    We add our claims before the user provided ones so that if they use the same claims
                    then the final payload will use the values they provide
                */
                    sub: userId,
                    iss: appInfo.apiDomain.getAsStringDangerous(),
                },
                accessTokenPayload
            );
            // Create the JWT
            let jwtResponse = yield jwtRecipeImplementation.createJWT({
                payload: accessTokenPayload,
                validitySeconds: jwtExpiry,
            });
            if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                // Should never come here
                throw new Error("JWT Signing algorithm not supported");
            }
            // Add the jwt and the property name to the access token payload
            accessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), {
                /*
                    We add the JWT after the user defined keys because we want to make sure that it never
                    gets overwritten by a user defined key. Using the same key as the one configured (or defaulting)
                    for the JWT should be considered a dev error
    
                    ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY indicates a reserved key used to determine the property name
                    with which the JWT is set, used to retrieve the JWT from the access token payload during refresg and
                    updateAccessTokenPayload
    
                    Note: If the user has multiple overrides each with a unique propertyNameInAccessTokenPayload, the logic
                    for checking the existing JWT when refreshing the session or updating the access token payload will not work.
                    This is because even though the jwt itself would be created with unique property names, the _jwtPName value would
                    always be overwritten by the override that runs last and when retrieving the jwt using that key name it cannot be
                    guaranteed that the right JWT is returned. This case is considered to be a rare requirement and we assume
                    that users will not need multiple JWT representations of their access token payload.
                */
                [jwtPropertyName]: jwtResponse.jwt,
                [constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY]: jwtPropertyName,
            });
            return accessTokenPayload;
        });
    }
    return Object.assign(Object.assign({}, originalImplementation), {
        createNewSession: function ({ res, userId, accessTokenPayload, sessionData }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = Math.ceil((yield this.getAccessTokenLifeTimeMS()) / 1000);
                accessTokenPayload = yield modifyAccessTokenPayload({
                    accessTokenPayload,
                    jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                    userId,
                    jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                });
                let sessionContainer = yield originalImplementation.createNewSession({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                });
                return new sessionClass_1.default(sessionContainer, jwtRecipeImplementation, appInfo);
            });
        },
        getSession: function ({ req, res, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                let sessionContainer = yield originalImplementation.getSession({ req, res, options });
                if (sessionContainer === undefined) {
                    return undefined;
                }
                return new sessionClass_1.default(sessionContainer, jwtRecipeImplementation, appInfo);
            });
        },
        refreshSession: function ({ req, res }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = Math.ceil((yield this.getAccessTokenLifeTimeMS()) / 1000);
                // Refresh session first because this will create a new access token
                let newSession = yield originalImplementation.refreshSession({ req, res });
                let accessTokenPayload = newSession.getAccessTokenPayload();
                accessTokenPayload = yield modifyAccessTokenPayload({
                    accessTokenPayload,
                    jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                    userId: newSession.getUserId(),
                    jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                });
                yield newSession.updateAccessTokenPayload(accessTokenPayload);
                return new sessionClass_1.default(newSession, jwtRecipeImplementation, appInfo);
            });
        },
        updateAccessTokenPayload: function ({ sessionHandle, newAccessTokenPayload }) {
            return __awaiter(this, void 0, void 0, function* () {
                let sessionInformation = yield this.getSessionInformation({ sessionHandle });
                let accessTokenPayload = sessionInformation.accessTokenPayload;
                let existingJwtPropertyName =
                    accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
                if (existingJwtPropertyName === undefined) {
                    return yield originalImplementation.updateAccessTokenPayload({
                        sessionHandle,
                        newAccessTokenPayload,
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
                newAccessTokenPayload = yield modifyAccessTokenPayload({
                    accessTokenPayload: newAccessTokenPayload,
                    jwtExpiry,
                    userId: sessionInformation.userId,
                    jwtPropertyName: existingJwtPropertyName,
                });
                return yield originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            });
        },
    });
}
exports.default = default_1;
