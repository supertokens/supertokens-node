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
class SessionClassWithJWT {
    constructor(originalSessionClass, jwtRecipeImplementation, config) {
        this.updateAccessTokenPayload = (newAccessTokenPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                let existingJWT = this.getAccessTokenPayload()[this.config.jwtKey];
                if (existingJWT === undefined) {
                    return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
                }
                let currentTimeInSeconds = Date.now() / 1000;
                let existingJWTValidity =
                    JSON.parse(Buffer.from(existingJWT.split(".")[1], "base64").toString("utf-8")).exp -
                    currentTimeInSeconds;
                let newJWTResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: newAccessTokenPayload,
                    validitySeconds: existingJWTValidity,
                });
                if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), {
                    [this.config.jwtKey]: newJWTResponse.jwt,
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
