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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeNumberInput = exports.validateAccessTokenStructure = exports.getInfoFromAccessToken = void 0;
const error_1 = __importDefault(require("./error"));
const jwt_1 = require("./jwt");
function getInfoFromAccessToken(jwtInfo, jwtSigningPublicKey, doAntiCsrfCheck) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            jwt_1.verifyJWT(jwtInfo, jwtSigningPublicKey);
            const payload = jwtInfo.payload;
            // This should be called before this function, but the check is very quick, so we can also do them here
            validateAccessTokenStructure(payload);
            // We can mark these as defined (the ! after the calls), since validateAccessTokenPayload checks this
            let sessionHandle = sanitizeStringInput(payload.sessionHandle);
            let userId = sanitizeStringInput(payload.userId);
            let refreshTokenHash1 = sanitizeStringInput(payload.refreshTokenHash1);
            let parentRefreshTokenHash1 = sanitizeStringInput(payload.parentRefreshTokenHash1);
            let userData = payload.userData;
            let antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken);
            let expiryTime = sanitizeNumberInput(payload.expiryTime);
            let timeCreated = sanitizeNumberInput(payload.timeCreated);
            if (antiCsrfToken === undefined && doAntiCsrfCheck) {
                throw Error("Access token does not contain the anti-csrf token.");
            }
            if (expiryTime < Date.now()) {
                throw Error("Access token expired");
            }
            return {
                sessionHandle,
                userId,
                refreshTokenHash1,
                parentRefreshTokenHash1,
                userData,
                antiCsrfToken,
                expiryTime,
                timeCreated,
            };
        } catch (err) {
            throw new error_1.default({
                message: "Failed to verify access token",
                type: error_1.default.TRY_REFRESH_TOKEN,
            });
        }
    });
}
exports.getInfoFromAccessToken = getInfoFromAccessToken;
function validateAccessTokenStructure(payload) {
    if (
        typeof payload.sessionHandle !== "string" ||
        typeof payload.userId !== "string" ||
        typeof payload.refreshTokenHash1 !== "string" ||
        payload.userData === undefined ||
        typeof payload.expiryTime !== "number" ||
        typeof payload.timeCreated !== "number"
    ) {
        // it would come here if we change the structure of the JWT.
        throw Error("Access token does not contain all the information. Maybe the structure has changed?");
    }
}
exports.validateAccessTokenStructure = validateAccessTokenStructure;
function sanitizeStringInput(field) {
    if (field === "") {
        return "";
    }
    if (typeof field !== "string") {
        return undefined;
    }
    try {
        let result = field.trim();
        return result;
    } catch (err) {}
    return undefined;
}
function sanitizeNumberInput(field) {
    if (typeof field === "number") {
        return field;
    }
    return undefined;
}
exports.sanitizeNumberInput = sanitizeNumberInput;
