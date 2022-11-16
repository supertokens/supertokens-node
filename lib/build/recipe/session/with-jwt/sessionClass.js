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
const error_1 = require("../error");
const recipe_1 = require("../recipe");
class SessionClassWithJWT {
    constructor(originalSessionClass, openIdRecipeImplementation) {
        this.originalSessionClass = originalSessionClass;
        this.openIdRecipeImplementation = openIdRecipeImplementation;
    }
    revokeSession(userContext) {
        return this.originalSessionClass.revokeSession(userContext);
    }
    getSessionData(userContext) {
        return this.originalSessionClass.getSessionData(userContext);
    }
    updateSessionData(newSessionData, userContext) {
        return this.originalSessionClass.updateSessionData(newSessionData, userContext);
    }
    getUserId(userContext) {
        return this.originalSessionClass.getUserId(userContext);
    }
    getAccessTokenPayload(userContext) {
        return this.originalSessionClass.getAccessTokenPayload(userContext);
    }
    getHandle(userContext) {
        return this.originalSessionClass.getHandle(userContext);
    }
    getAccessToken(userContext) {
        return this.originalSessionClass.getAccessToken(userContext);
    }
    getTimeCreated(userContext) {
        return this.originalSessionClass.getTimeCreated(userContext);
    }
    getExpiry(userContext) {
        return this.originalSessionClass.getExpiry(userContext);
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    assertClaims(claimValidators, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let validateClaimResponse = yield recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.validateClaims({
                    accessTokenPayload: this.getAccessTokenPayload(userContext),
                    userId: this.getUserId(userContext),
                    claimValidators,
                    userContext,
                });
            if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
                yield this.mergeIntoAccessTokenPayload(validateClaimResponse.accessTokenPayloadUpdate, userContext);
            }
            if (validateClaimResponse.invalidClaims.length !== 0) {
                throw new error_1.default({
                    type: "INVALID_CLAIMS",
                    message: "INVALID_CLAIMS",
                    payload: validateClaimResponse.invalidClaims,
                });
            }
        });
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    fetchAndSetClaim(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = yield claim.build(this.getUserId(userContext), userContext);
            return this.mergeIntoAccessTokenPayload(update, userContext);
        });
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    setClaimValue(claim, value, userContext) {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    getClaimValue(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return claim.getValueFromPayload(yield this.getAccessTokenPayload(userContext), userContext);
        });
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    removeClaim(claim, userContext) {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    // We copy the implementation here, since we want to override updateAccessTokenPayload
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedPayload = Object.assign(
                Object.assign({}, this.getAccessTokenPayload(userContext)),
                accessTokenPayloadUpdate
            );
            for (const key of Object.keys(accessTokenPayloadUpdate)) {
                if (accessTokenPayloadUpdate[key] === null) {
                    delete updatedPayload[key];
                }
            }
            yield this.updateAccessTokenPayload(updatedPayload, userContext);
        });
    }
    // TODO: figure out a proper way to override just this function
    /**
     * @deprecated use mergeIntoAccessTokenPayload instead
     */
    updateAccessTokenPayload(newAccessTokenPayload, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload, userContext);
        });
    }
}
exports.default = SessionClassWithJWT;
