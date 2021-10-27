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
exports.default = (originalImplementation, jwtRecipeImplementation) => {
    return Object.assign(Object.assign({}, originalImplementation), {
        createNewSession: function ({ res, userId, accessTokenPayload, sessionData }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = (yield originalImplementation.getAccessTokenLifeTimeMS()) / 1000;
                let jwtResponse = yield jwtRecipeImplementation.createJWT({
                    payload: accessTokenPayload,
                    validitySeconds: accessTokenValidityInSeconds + EXPIRY_OFFSET_SECONDS,
                });
                if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                accessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { jwt: jwtResponse.jwt });
                return yield originalImplementation.createNewSession({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                });
            });
        },
        refreshSession: function ({ req, res }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenValidityInSeconds = (yield originalImplementation.getAccessTokenLifeTimeMS()) / 1000;
                // Refresh session first because this will create a new access token
                let newSession = yield originalImplementation.refreshSession({ req, res });
                let accessTokenPayload = newSession.getAccessTokenPayload();
                // Remove the old jwt
                delete accessTokenPayload.jwt;
                let jwtResponse = yield jwtRecipeImplementation.createJWT({
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
        },
        updateAccessTokenPayload: function ({ sessionHandle, newAccessTokenPayload }) {
            return __awaiter(this, void 0, void 0, function* () {
                // Remove the JWT from the new access token payload
                delete newAccessTokenPayload.jwt;
                // Get the current sessions expiry to calculate the validity to use for the JWT
                let sessionInformation = yield originalImplementation.getSessionInformation({ sessionHandle });
                let sessionExpiryInMillis = sessionInformation.expiry;
                let sessionvalidityInSeconds = (sessionExpiryInMillis - Date.now()) / 1000;
                let newJWTResponse = yield jwtRecipeImplementation.createJWT({
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
                return yield originalImplementation.updateAccessTokenPayload({ sessionHandle, newAccessTokenPayload });
            });
        },
    });
};
