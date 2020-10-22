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
const error_1 = require("./error");
const _1 = require("./");
class HandshakeInfo {
    constructor(
        jwtSigningPublicKey,
        enableAntiCsrf,
        accessTokenBlacklistingEnabled,
        jwtSigningPublicKeyExpiryTime,
        accessTokenVaildity,
        refreshTokenVaildity
    ) {
        this.updateJwtSigningPublicKeyInfo = (newKey, newExpiry) => {
            this.jwtSigningPublicKey = newKey;
            this.jwtSigningPublicKeyExpiryTime = newExpiry;
        };
        this.jwtSigningPublicKey = jwtSigningPublicKey;
        this.enableAntiCsrf = enableAntiCsrf;
        this.accessTokenBlacklistingEnabled = accessTokenBlacklistingEnabled;
        this.jwtSigningPublicKeyExpiryTime = jwtSigningPublicKeyExpiryTime;
        this.accessTokenVaildity = accessTokenVaildity;
        this.refreshTokenVaildity = refreshTokenVaildity;
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        HandshakeInfo.instance = undefined;
    }
    // @throws GENERAL_ERROR
    static getInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (HandshakeInfo.instance == undefined) {
                let response = yield _1.getQuerier().sendPostRequest("/handshake", {});
                HandshakeInfo.instance = new HandshakeInfo(
                    response.jwtSigningPublicKey,
                    response.enableAntiCsrf,
                    response.accessTokenBlacklistingEnabled,
                    response.jwtSigningPublicKeyExpiryTime,
                    response.accessTokenVaildity,
                    response.refreshTokenVaildity
                );
            }
            return HandshakeInfo.instance;
        });
    }
}
exports.HandshakeInfo = HandshakeInfo;
//# sourceMappingURL=handshakeInfo.js.map
