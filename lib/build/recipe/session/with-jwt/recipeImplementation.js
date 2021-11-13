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
const sessionClass_1 = require("./sessionClass");
const recipeImplementation_1 = require("../recipeImplementation");
const processState_1 = require("../../../processState");
const normalisedURLPath_1 = require("../../../normalisedURLPath");
function default_1(originalImplementation, jwtRecipeImplementation, config, querier) {
    const EXPIRY_OFFSET_SECONDS = 30;
    let handshakeInfo;
    // TODO: See if this duplication for helper can be avoided
    function getHandshakeInfo(forceRefetch = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (
                handshakeInfo === undefined ||
                handshakeInfo.getJwtSigningPublicKeyList().length === 0 ||
                forceRefetch
            ) {
                let antiCsrf = config.antiCsrf;
                processState_1.ProcessState.getInstance().addState(
                    processState_1.PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO
                );
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/handshake"), {});
                handshakeInfo = new recipeImplementation_1.HandshakeInfo(
                    antiCsrf,
                    response.accessTokenBlacklistingEnabled,
                    response.accessTokenValidity,
                    response.refreshTokenValidity,
                    response.jwtSigningPublicKeyList
                );
                updateJwtSigningPublicKeyInfo(
                    response.jwtSigningPublicKeyList,
                    response.jwtSigningPublicKey,
                    response.jwtSigningPublicKeyExpiryTime
                );
            }
            return handshakeInfo;
        });
    }
    function updateJwtSigningPublicKeyInfo(keyList, publicKey, expiryTime) {
        if (keyList === undefined) {
            // Setting createdAt to Date.now() emulates the old lastUpdatedAt logic
            keyList = [{ publicKey, expiryTime, createdAt: Date.now() }];
        }
        if (handshakeInfo !== undefined) {
            handshakeInfo.setJwtSigningPublicKeyList(keyList);
        }
    }
    let helpers = {
        querier,
        updateJwtSigningPublicKeyInfo,
        getHandshakeInfo,
        config,
    };
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
                let sessionContainer = yield originalImplementation.createNewSession({
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                });
                return new sessionClass_1.default(
                    helpers,
                    sessionContainer.getAccessToken(),
                    sessionContainer.getHandle(),
                    sessionContainer.getUserId(),
                    sessionContainer.getAccessTokenPayload(),
                    res,
                    jwtRecipeImplementation
                );
            });
        },
        getSession: function ({ req, res, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                let sessionContainer = yield originalImplementation.getSession({ req, res, options });
                if (sessionContainer === undefined) {
                    return undefined;
                }
                return new sessionClass_1.default(
                    helpers,
                    sessionContainer.getAccessToken(),
                    sessionContainer.getHandle(),
                    sessionContainer.getUserId(),
                    sessionContainer.getAccessTokenPayload(),
                    res,
                    jwtRecipeImplementation
                );
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
                return new sessionClass_1.default(
                    helpers,
                    newSession.getAccessToken(),
                    newSession.getHandle(),
                    newSession.getUserId(),
                    newSession.getAccessTokenPayload(),
                    res,
                    jwtRecipeImplementation
                );
            });
        },
        updateAccessTokenPayload: function ({ sessionHandle, newAccessTokenPayload }) {
            return __awaiter(this, void 0, void 0, function* () {
                let sessionInformation = yield originalImplementation.getSessionInformation({ sessionHandle });
                let existingJWT = sessionInformation.accessTokenPayload.jwt;
                if (existingJWT === undefined) {
                    return yield originalImplementation.updateAccessTokenPayload({
                        sessionHandle,
                        newAccessTokenPayload,
                    });
                }
                // Get the validity of the current JWT
                let currentTimeInSeconds = Date.now() / 1000;
                let existingJWTValidity =
                    JSON.parse(Buffer.from(existingJWT.split(".")[1], "base64").toString("utf-8")).exp -
                    currentTimeInSeconds;
                let newJWTResponse = yield jwtRecipeImplementation.createJWT({
                    payload: newAccessTokenPayload,
                    validitySeconds: existingJWTValidity,
                });
                if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), {
                    jwt: newJWTResponse.jwt,
                });
                return yield originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            });
        },
    });
}
exports.default = default_1;
