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
const SessionFunctions = require("./sessionFunctions");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const utils_1 = require("./utils");
const sessionClass_1 = require("./sessionClass");
const error_1 = require("./error");
const utils_2 = require("../../utils");
const processState_1 = require("../../processState");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const supertokens_1 = require("../../supertokens");
const framework_1 = require("../../framework");
class HandshakeInfo {
    constructor(
        antiCsrf,
        accessTokenBlacklistingEnabled,
        accessTokenValidity,
        refreshTokenValidity,
        rawJwtSigningPublicKeyList
    ) {
        this.antiCsrf = antiCsrf;
        this.accessTokenBlacklistingEnabled = accessTokenBlacklistingEnabled;
        this.accessTokenValidity = accessTokenValidity;
        this.refreshTokenValidity = refreshTokenValidity;
        this.rawJwtSigningPublicKeyList = rawJwtSigningPublicKeyList;
    }
    setJwtSigningPublicKeyList(updatedList) {
        this.rawJwtSigningPublicKeyList = updatedList;
    }
    getJwtSigningPublicKeyList() {
        return this.rawJwtSigningPublicKeyList.filter((key) => key.expiryTime > Date.now());
    }
    clone() {
        return new HandshakeInfo(
            this.antiCsrf,
            this.accessTokenBlacklistingEnabled,
            this.accessTokenValidity,
            this.refreshTokenValidity,
            this.rawJwtSigningPublicKeyList
        );
    }
}
exports.HandshakeInfo = HandshakeInfo;
function getRecipeInterface(querier, config) {
    let handshakeInfo;
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
                handshakeInfo = new HandshakeInfo(
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
    let obj = {
        createNewSession: function ({ res, userId, accessTokenPayload = {}, sessionData = {}, grantsToCheck }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!res.wrapperUsed) {
                    res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(
                        res
                    );
                }
                if (grantsToCheck === undefined) {
                    grantsToCheck = config.defaultRequiredGrants;
                }
                let sessionGrants = {};
                for (const grant of grantsToCheck) {
                    const value = grant.fetchGrant(userId, {});
                    grant.addToGrantPayload(sessionGrants, value, {});
                }
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    userId,
                    accessTokenPayload,
                    sessionData
                );
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, res, response);
                return new sessionClass_1.default(
                    helpers,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    response.session.grants,
                    res
                );
            });
        },
        getSession: function ({ req, res, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!res.wrapperUsed) {
                    res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(
                        res
                    );
                }
                if (!req.wrapperUsed) {
                    req = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapRequest(
                        req
                    );
                }
                let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
                let idRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
                if (idRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                        // there is no session that exists here, and the user wants session verification
                        // to be optional. So we return undefined.
                        return undefined;
                    }
                    throw new error_1.default({
                        message:
                            "Session does not exist. Are you sending the session tokens in the request as cookies?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                let accessToken = cookieAndHeaders_1.getAccessTokenFromCookie(req);
                if (accessToken === undefined) {
                    // maybe the access token has expired.
                    /**
                     * Based on issue: #156 (spertokens-node)
                     * we throw TRY_REFRESH_TOKEN only if
                     * options.sessionRequired === true || (frontendHasInterceptor or request method is get),
                     * else we should return undefined
                     */
                    if (
                        options === undefined ||
                        (options !== undefined && options.sessionRequired === true) ||
                        utils_2.frontendHasInterceptor(req) ||
                        utils_2.normaliseHttpMethod(req.getMethod()) === "get"
                    ) {
                        throw new error_1.default({
                            message: "Access token has expired. Please call the refresh API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    }
                    return undefined;
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    if (doAntiCsrfCheck === undefined) {
                        doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.getMethod()) !== "get";
                    }
                    let response = yield SessionFunctions.getSession(
                        helpers,
                        accessToken,
                        antiCsrfToken,
                        doAntiCsrfCheck,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
                    if (response.accessToken !== undefined) {
                        cookieAndHeaders_1.setFrontTokenInHeaders(
                            res,
                            response.session.userId,
                            response.accessToken.expiry,
                            response.session.userDataInJWT,
                            response.session.grants
                        );
                        cookieAndHeaders_1.attachAccessTokenToCookie(
                            config,
                            res,
                            response.accessToken.token,
                            response.accessToken.expiry
                        );
                        accessToken = response.accessToken.token;
                    }
                    return new sessionClass_1.default(
                        helpers,
                        accessToken,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        response.session.grants,
                        res
                    );
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(config, res);
                    }
                    throw err;
                }
            });
        },
        getSessionInformation: function ({ sessionHandle }) {
            return __awaiter(this, void 0, void 0, function* () {
                return SessionFunctions.getSessionInformation(helpers, sessionHandle);
            });
        },
        refreshSession: function ({ req, res }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!res.wrapperUsed) {
                    res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(
                        res
                    );
                }
                if (!req.wrapperUsed) {
                    req = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapRequest(
                        req
                    );
                }
                let inputIdRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
                if (inputIdRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    throw new error_1.default({
                        message:
                            "Session does not exist. Are you sending the session tokens in the request as cookies?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                try {
                    let inputRefreshToken = cookieAndHeaders_1.getRefreshTokenFromCookie(req);
                    if (inputRefreshToken === undefined) {
                        throw new error_1.default({
                            message:
                                "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                            type: error_1.default.UNAUTHORISED,
                        });
                    }
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(
                        helpers,
                        inputRefreshToken,
                        antiCsrfToken,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, res, response);
                    return new sessionClass_1.default(
                        helpers,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        response.session.grants,
                        res
                    );
                } catch (err) {
                    if (
                        (err.type === error_1.default.UNAUTHORISED && err.payload.clearCookies) ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        cookieAndHeaders_1.clearSessionFromCookie(config, res);
                    }
                    throw err;
                }
            });
        },
        regenerateAccessToken: function (input) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                let newAccessTokenPayload =
                    input.newAccessTokenPayload === null || input.newAccessTokenPayload === undefined
                        ? {}
                        : input.newAccessTokenPayload;
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/session/regenerate"),
                    {
                        accessToken: input.accessToken,
                        userDataInJWT: newAccessTokenPayload,
                        grants: (_a = input.newGrants) !== null && _a !== void 0 ? _a : {},
                    }
                );
                if (response.status === "UNAUTHORISED") {
                    throw new error_1.default({
                        message: response.message,
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return response;
            });
        },
        revokeAllSessionsForUser: function ({ userId }) {
            return SessionFunctions.revokeAllSessionsForUser(helpers, userId);
        },
        getAllSessionHandlesForUser: function ({ userId }) {
            return SessionFunctions.getAllSessionHandlesForUser(helpers, userId);
        },
        revokeSession: function ({ sessionHandle }) {
            return SessionFunctions.revokeSession(helpers, sessionHandle);
        },
        revokeMultipleSessions: function ({ sessionHandles }) {
            return SessionFunctions.revokeMultipleSessions(helpers, sessionHandles);
        },
        updateSessionData: function ({ sessionHandle, newSessionData }) {
            return SessionFunctions.updateSessionData(helpers, sessionHandle, newSessionData);
        },
        updateAccessTokenPayload: function ({ sessionHandle, newAccessTokenPayload }) {
            return SessionFunctions.updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload);
        },
        updateSessionGrants: function ({ sessionHandle, grants }) {
            return SessionFunctions.updateSessionGrants(helpers, sessionHandle, grants);
        },
        getAccessTokenLifeTimeMS: function () {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield getHandshakeInfo()).accessTokenValidity;
            });
        },
        getRefreshTokenLifeTimeMS: function () {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield getHandshakeInfo()).refreshTokenValidity;
            });
        },
    };
    let helpers = {
        querier,
        updateJwtSigningPublicKeyInfo,
        getHandshakeInfo,
        config,
        sessionRecipeImpl: obj,
    };
    if (process.env.TEST_MODE === "testing") {
        // testing mode, we add some of the help functions to the obj
        obj.getHandshakeInfo = getHandshakeInfo;
        obj.updateJwtSigningPublicKeyInfo = updateJwtSigningPublicKeyInfo;
        obj.helpers = helpers;
        obj.setHandshakeInfo = function (info) {
            handshakeInfo = info;
        };
    }
    return obj;
}
exports.default = getRecipeInterface;
