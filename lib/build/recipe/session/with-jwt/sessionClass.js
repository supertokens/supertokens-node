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
    constructor(originalSessionClass, jwtRecipeImplementation, appInfo) {
        this.revokeSession = () => {
            return this.originalSessionClass.revokeSession();
        };
        this.getSessionData = () => {
            return this.originalSessionClass.getSessionData();
        };
        this.updateSessionData = (newSessionData) => {
            return this.originalSessionClass.updateSessionData(newSessionData);
        };
        this.getUserId = () => {
            return this.originalSessionClass.getUserId();
        };
        this.getAccessTokenPayload = () => {
            return this.originalSessionClass.getAccessTokenPayload();
        };
        this.getHandle = () => {
            return this.originalSessionClass.getHandle();
        };
        this.getAccessToken = () => {
            return this.originalSessionClass.getAccessToken();
        };
        this.getTimeCreated = () => {
            return this.originalSessionClass.getTimeCreated();
        };
        this.getExpiry = () => {
            return this.originalSessionClass.getExpiry();
        };
        this.updateAccessTokenPayload = (newAccessTokenPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                let accessTokenPayload = this.getAccessTokenPayload();
                let jwtPropertyName = accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
                if (jwtPropertyName === undefined) {
                    return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
                }
                let existingJWT = accessTokenPayload[jwtPropertyName];
                assert.notStrictEqual(existingJWT, undefined);
                delete accessTokenPayload[jwtPropertyName];
                delete accessTokenPayload[constants_1.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
                let currentTimeInSeconds = Date.now() / 1000;
                let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });
                // JsonWebToken.decode possibly returns null
                if (decodedPayload === null) {
                    throw new Error("Error reading JWT from session");
                }
                let jwtExpiry = decodedPayload.exp - currentTimeInSeconds;
                newAccessTokenPayload = yield utils_1.modifyAccessTokenPayload({
                    accessTokenPayload: newAccessTokenPayload,
                    jwtExpiry,
                    userId: this.getUserId(),
                    jwtPropertyName,
                    appInfo: this.appInfo,
                    jwtRecipeImplementation: this.jwtRecipeImplementation,
                });
                return yield this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
            });
        this.jwtRecipeImplementation = jwtRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
        this.appInfo = appInfo;
    }
}
exports.default = SessionClassWithJWT;
