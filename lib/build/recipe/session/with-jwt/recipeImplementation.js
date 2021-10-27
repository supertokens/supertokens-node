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
const EXPIRY_OFFSET_SECONDS = 30;
class RecipeImplementation {
    constructor(originalImplementation, jwtRecipeImplementation) {
        this.createNewSession = function ({ res, userId, accessTokenPayload, sessionData }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = (yield this.getAccessTokenLifeTimeMS()) / 1000;
                let jwtResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: accessTokenPayload,
                    validitySeconds: accessTokenValidityInSeconds + EXPIRY_OFFSET_SECONDS,
                });
                if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                accessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { jwt: jwtResponse.jwt });
                return yield this.originalImplementation.createNewSession.bind(this)({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                });
            });
        };
        this.getSession = function ({ req, res, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getSession.bind(this)({ req, res, options });
            });
        };
        this.refreshSession = function ({ req, res }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = (yield this.getAccessTokenLifeTimeMS()) / 1000;
                // Refresh session first because this will create a new access token
                let newSession = yield this.originalImplementation.refreshSession.bind(this)({ req, res });
                let accessTokenPayload = newSession.getAccessTokenPayload();
                // Remove the old jwt
                delete accessTokenPayload.jwt;
                let jwtResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: accessTokenPayload,
                    validitySeconds: accessTokenValidityInSeconds + EXPIRY_OFFSET_SECONDS,
                });
                if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                accessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { jwt: jwtResponse.jwt });
                yield newSession.updateAccessTokenPayload(accessTokenPayload);
                return newSession;
            });
        };
        this.getSessionInformation = function ({ sessionHandle }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getSessionInformation.bind(this)({ sessionHandle });
            });
        };
        this.revokeAllSessionsForUser = function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeAllSessionsForUser.bind(this)({ userId });
            });
        };
        this.getAllSessionHandlesForUser = function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getAllSessionHandlesForUser.bind(this)({ userId });
            });
        };
        this.revokeSession = function ({ sessionHandle }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeSession.bind(this)({ sessionHandle });
            });
        };
        this.revokeMultipleSessions = function ({ sessionHandles }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeMultipleSessions.bind(this)({ sessionHandles });
            });
        };
        this.updateSessionData = function ({ sessionHandle, newSessionData }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.updateSessionData.bind(this)({
                    sessionHandle,
                    newSessionData,
                });
            });
        };
        this.updateAccessTokenPayload = function ({ sessionHandle, newAccessTokenPayload }) {
            return __awaiter(this, void 0, void 0, function* () {
                // Remove the JWT from the new access token payload
                delete newAccessTokenPayload.jwt;
                // Get the current sessions expiry to calculate the validity to use for the JWT
                let sessionInformation = yield this.getSessionInformation({ sessionHandle });
                let sessionExpiryInMillis = sessionInformation.expiry;
                let sessionvalidityInSeconds = (sessionExpiryInMillis - Date.now()) / 1000;
                let newJWTResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: newAccessTokenPayload,
                    validitySeconds: sessionvalidityInSeconds + EXPIRY_OFFSET_SECONDS,
                });
                if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), {
                    jwt: newJWTResponse.jwt,
                });
                return yield this.originalImplementation.updateAccessTokenPayload.bind(this)({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            });
        };
        this.getAccessTokenLifeTimeMS = function () {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
            });
        };
        this.getRefreshTokenLifeTimeMS = function () {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getRefreshTokenLifeTimeMS.bind(this)();
            });
        };
        this.originalImplementation = originalImplementation;
        this.jwtRecipeImplementation = jwtRecipeImplementation;
    }
}
exports.default = RecipeImplementation;
