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
        this.createNewSession = ({ res, userId, accessTokenPayload, sessionData }) =>
            __awaiter(this, void 0, void 0, function* () {
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
                return yield this.originalImplementation.createNewSession({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                });
            });
        this.getSession = ({ req, res, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getSession({ req, res, options });
            });
        this.refreshSession = ({ req, res }) =>
            __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = (yield this.getAccessTokenLifeTimeMS()) / 1000;
                // Refresh session first because this will create a new access token
                let newSession = yield this.originalImplementation.refreshSession({ req, res });
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
        this.getSessionInformation = ({ sessionHandle }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getSessionInformation({ sessionHandle });
            });
        this.revokeAllSessionsForUser = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeAllSessionsForUser({ userId });
            });
        this.getAllSessionHandlesForUser = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getAllSessionHandlesForUser({ userId });
            });
        this.revokeSession = ({ sessionHandle }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeSession({ sessionHandle });
            });
        this.revokeMultipleSessions = ({ sessionHandles }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.revokeMultipleSessions({ sessionHandles });
            });
        this.updateSessionData = ({ sessionHandle, newSessionData }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.updateSessionData({ sessionHandle, newSessionData });
            });
        this.updateAccessTokenPayload = ({ sessionHandle, newAccessTokenPayload }) =>
            __awaiter(this, void 0, void 0, function* () {
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
                return yield this.originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            });
        this.getAccessTokenLifeTimeMS = () =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getAccessTokenLifeTimeMS();
            });
        this.getRefreshTokenLifeTimeMS = () =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.originalImplementation.getRefreshTokenLifeTimeMS();
            });
        this.originalImplementation = originalImplementation;
        this.jwtRecipeImplementation = jwtRecipeImplementation;
    }
}
exports.default = RecipeImplementation;
