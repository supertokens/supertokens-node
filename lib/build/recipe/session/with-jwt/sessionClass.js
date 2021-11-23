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
class SessionClassWithJWT {
    constructor(originalSessionClass, jwtRecipeImplementation, config) {
        this.updateAccessTokenPayload = (newAccessTokenPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                let existingJWT = this.getAccessTokenPayload()[this.config.jwt.propertyNameInAccessTokenPayload];
                if (existingJWT === undefined) {
                    return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
                }
                let currentTimeInSeconds = Date.now() / 1000;
                let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });
                // JsonWebToken.decode possibly returns null
                if (decodedPayload === null) {
                    throw new Error("Error reading JWT from session");
                }
                let existingJWTValidity = decodedPayload.exp - currentTimeInSeconds;
                let newJWTResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: newAccessTokenPayload,
                    validitySeconds: existingJWTValidity,
                });
                if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), {
                    [this.config.jwt.propertyNameInAccessTokenPayload]: newJWTResponse.jwt,
                });
                return yield this.originalSessionClass.updateAccessTokenPayload({
                    newAccessTokenPayload,
                });
            });
        this.jwtRecipeImplementation = jwtRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
        this.config = config;
    }
    revokeSession() {
        return this.originalSessionClass.revokeSession();
    }
    getSessionData() {
        return this.originalSessionClass.getSessionData();
    }
    updateSessionData(newSessionData) {
        return this.originalSessionClass.updateSessionData(newSessionData);
    }
    getUserId() {
        return this.originalSessionClass.getUserId();
    }
    getAccessTokenPayload() {
        return this.originalSessionClass.getAccessTokenPayload();
    }
    getHandle() {
        return this.originalSessionClass.getHandle();
    }
    getAccessToken() {
        return this.originalSessionClass.getAccessToken();
    }
    getTimeCreated() {
        return this.originalSessionClass.getTimeCreated();
    }
    getExpiry() {
        return this.originalSessionClass.getExpiry();
    }
}
exports.default = SessionClassWithJWT;
