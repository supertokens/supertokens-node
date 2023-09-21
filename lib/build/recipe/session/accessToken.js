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
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __asyncValues =
    (this && this.__asyncValues) ||
    function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator],
            i;
        return m
            ? m.call(o)
            : ((o = typeof __values === "function" ? __values(o) : o[Symbol.iterator]()),
              (i = {}),
              verb("next"),
              verb("throw"),
              verb("return"),
              (i[Symbol.asyncIterator] = function () {
                  return this;
              }),
              i);
        function verb(n) {
            i[n] =
                o[n] &&
                function (v) {
                    return new Promise(function (resolve, reject) {
                        (v = o[n](v)), settle(resolve, reject, v.done, v.value);
                    });
                };
        }
        function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function (v) {
                resolve({ value: v, done: d });
            }, reject);
        }
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeNumberInput = exports.validateAccessTokenStructure = exports.getInfoFromAccessToken = void 0;
const error_1 = __importDefault(require("./error"));
const jose = __importStar(require("jose"));
const processState_1 = require("../../processState");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const logger_1 = require("../../logger");
const constants_1 = require("../multitenancy/constants");
async function getInfoFromAccessToken(jwtInfo, jwks, doAntiCsrfCheck) {
    var e_1, _a;
    var _b;
    try {
        // From the library examples
        let payload = undefined;
        try {
            payload = (await jose.jwtVerify(jwtInfo.rawTokenString, jwks)).payload;
        } catch (error) {
            // We only want to opt-into this for V2 access tokens
            if (
                jwtInfo.version === 2 &&
                (error === null || error === void 0 ? void 0 : error.code) === "ERR_JWKS_MULTIPLE_MATCHING_KEYS"
            ) {
                processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.MULTI_JWKS_VALIDATION);
                try {
                    // We are trying to validate the token with each key.
                    // Since the kid is missing from v2 tokens, this basically means we try all keys present in the cache.
                    for (
                        var error_2 = __asyncValues(error), error_2_1;
                        (error_2_1 = await error_2.next()), !error_2_1.done;

                    ) {
                        const publicKey = error_2_1.value;
                        try {
                            payload = (await jose.jwtVerify(jwtInfo.rawTokenString, publicKey)).payload;
                            break;
                        } catch (innerError) {
                            if (
                                (innerError === null || innerError === void 0 ? void 0 : innerError.code) ===
                                "ERR_JWS_SIGNATURE_VERIFICATION_FAILED"
                            ) {
                                continue;
                            }
                            throw innerError;
                        }
                    }
                } catch (e_1_1) {
                    e_1 = { error: e_1_1 };
                } finally {
                    try {
                        if (error_2_1 && !error_2_1.done && (_a = error_2.return)) await _a.call(error_2);
                    } finally {
                        if (e_1) throw e_1.error;
                    }
                }
                if (payload === undefined) {
                    throw new jose.errors.JWSSignatureVerificationFailed();
                }
            } else {
                throw error;
            }
        }
        // This should be called before this function, but the check is very quick, so we can also do them here
        validateAccessTokenStructure(payload, jwtInfo.version);
        // We can mark these as defined (the ! after the calls), since validateAccessTokenPayload checks this
        let userId = jwtInfo.version === 2 ? sanitizeStringInput(payload.userId) : sanitizeStringInput(payload.sub);
        let expiryTime =
            jwtInfo.version === 2 ? sanitizeNumberInput(payload.expiryTime) : sanitizeNumberInput(payload.exp) * 1000;
        let timeCreated =
            jwtInfo.version === 2 ? sanitizeNumberInput(payload.timeCreated) : sanitizeNumberInput(payload.iat) * 1000;
        let userData = jwtInfo.version === 2 ? payload.userData : payload;
        let sessionHandle = sanitizeStringInput(payload.sessionHandle);
        // we use ?? below cause recipeUserId may be undefined for JWTs that are of an older version.
        let recipeUserId = new recipeUserId_1.default(
            (_b = sanitizeStringInput(payload.rsub)) !== null && _b !== void 0 ? _b : userId
        );
        let refreshTokenHash1 = sanitizeStringInput(payload.refreshTokenHash1);
        let parentRefreshTokenHash1 = sanitizeStringInput(payload.parentRefreshTokenHash1);
        let antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken);
        let tenantId = constants_1.DEFAULT_TENANT_ID;
        if (jwtInfo.version >= 4) {
            tenantId = sanitizeStringInput(payload.tId);
        }
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
            recipeUserId,
            tenantId,
        };
    } catch (err) {
        logger_1.logDebugMessage(
            "getInfoFromAccessToken: Returning TRY_REFRESH_TOKEN because access token validation failed - " +
                err.message
        );
        throw new error_1.default({
            message: "Failed to verify access token",
            type: error_1.default.TRY_REFRESH_TOKEN,
        });
    }
}
exports.getInfoFromAccessToken = getInfoFromAccessToken;
function validateAccessTokenStructure(payload, version) {
    if (version >= 5) {
        if (
            typeof payload.sub !== "string" ||
            typeof payload.exp !== "number" ||
            typeof payload.iat !== "number" ||
            typeof payload.sessionHandle !== "string" ||
            typeof payload.refreshTokenHash1 !== "string" ||
            typeof payload.rsub !== "string"
        ) {
            logger_1.logDebugMessage("validateAccessTokenStructure: Access token is using version >= 4");
            // The error message below will be logged by the error handler that translates this into a TRY_REFRESH_TOKEN_ERROR
            // it would come here if we change the structure of the JWT.
            throw Error("Access token does not contain all the information. Maybe the structure has changed?");
        }
    } else if (version >= 4) {
        if (
            typeof payload.sub !== "string" ||
            typeof payload.exp !== "number" ||
            typeof payload.iat !== "number" ||
            typeof payload.sessionHandle !== "string" ||
            typeof payload.refreshTokenHash1 !== "string"
        ) {
            logger_1.logDebugMessage("validateAccessTokenStructure: Access token is using version >= 4");
            // The error message below will be logged by the error handler that translates this into a TRY_REFRESH_TOKEN_ERROR
            // it would come here if we change the structure of the JWT.
            throw Error("Access token does not contain all the information. Maybe the structure has changed?");
        }
    } else if (version >= 3) {
        if (
            typeof payload.sub !== "string" ||
            typeof payload.exp !== "number" ||
            typeof payload.iat !== "number" ||
            typeof payload.sessionHandle !== "string" ||
            typeof payload.refreshTokenHash1 !== "string"
        ) {
            logger_1.logDebugMessage("validateAccessTokenStructure: Access token is using version >= 3");
            // The error message below will be logged by the error handler that translates this into a TRY_REFRESH_TOKEN_ERROR
            // it would come here if we change the structure of the JWT.
            throw Error("Access token does not contain all the information. Maybe the structure has changed?");
        }
        if (version >= 4) {
            if (typeof payload.tId !== "string") {
                throw Error("Access token does not contain all the information. Maybe the structure has changed?");
            }
        }
    } else if (
        typeof payload.sessionHandle !== "string" ||
        typeof payload.userId !== "string" ||
        typeof payload.refreshTokenHash1 !== "string" ||
        payload.userData === undefined ||
        typeof payload.expiryTime !== "number" ||
        typeof payload.timeCreated !== "number"
    ) {
        logger_1.logDebugMessage("validateAccessTokenStructure: Access token is using version < 3");
        // The error message below will be logged by the error handler that translates this into a TRY_REFRESH_TOKEN_ERROR
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
