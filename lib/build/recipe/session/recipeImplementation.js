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
class RecipeImplementation {
    constructor(querier, config, isInServerlessEnv) {
        this.handshakeInfo = undefined;
        this.createNewSession = ({ res, userId, jwtPayload = {}, sessionData = {} }) =>
            __awaiter(this, void 0, void 0, function* () {
                if (!res.wrapperUsed) {
                    res = framework_1.default[supertokens_1.default.getInstanceOrThrowError().framework].wrapResponse(
                        res
                    );
                }
                let response = yield SessionFunctions.createNewSession(this, userId, jwtPayload, sessionData);
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this.config, res, response);
                return new sessionClass_1.default(
                    this,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res
                );
            });
        this.getSession = ({ req, res, options }) =>
            __awaiter(this, void 0, void 0, function* () {
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
                        this,
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
                            response.session.userDataInJWT
                        );
                        cookieAndHeaders_1.attachAccessTokenToCookie(
                            this.config,
                            res,
                            response.accessToken.token,
                            response.accessToken.expiry
                        );
                        accessToken = response.accessToken.token;
                    }
                    return new sessionClass_1.default(
                        this,
                        accessToken,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res
                    );
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.config, res);
                    }
                    throw err;
                }
            });
        this.getSessionInformation = ({ sessionHandle }) =>
            __awaiter(this, void 0, void 0, function* () {
                return SessionFunctions.getSessionInformation(this, sessionHandle);
            });
        this.refreshSession = ({ req, res }) =>
            __awaiter(this, void 0, void 0, function* () {
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
                        this,
                        inputRefreshToken,
                        antiCsrfToken,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this.config, res, response);
                    return new sessionClass_1.default(
                        this,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res
                    );
                } catch (err) {
                    if (
                        (err.type === error_1.default.UNAUTHORISED && err.payload.clearCookies) ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.config, res);
                    }
                    throw err;
                }
            });
        this.revokeAllSessionsForUser = ({ userId }) => {
            return SessionFunctions.revokeAllSessionsForUser(this, userId);
        };
        this.getAllSessionHandlesForUser = ({ userId }) => {
            return SessionFunctions.getAllSessionHandlesForUser(this, userId);
        };
        this.revokeSession = ({ sessionHandle }) => {
            return SessionFunctions.revokeSession(this, sessionHandle);
        };
        this.revokeMultipleSessions = ({ sessionHandles }) => {
            return SessionFunctions.revokeMultipleSessions(this, sessionHandles);
        };
        this.updateSessionData = ({ sessionHandle, newSessionData }) => {
            return SessionFunctions.updateSessionData(this, sessionHandle, newSessionData);
        };
        this.updateJWTPayload = ({ sessionHandle, newJWTPayload }) => {
            return SessionFunctions.updateJWTPayload(this, sessionHandle, newJWTPayload);
        };
        this.getHandshakeInfo = (forceRefetch = false) =>
            __awaiter(this, void 0, void 0, function* () {
                if (
                    this.handshakeInfo === undefined ||
                    this.handshakeInfo.getJwtSigningPublicKeyList().length === 0 ||
                    forceRefetch
                ) {
                    let antiCsrf = this.config.antiCsrf;
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO
                    );
                    let response = yield this.querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/handshake"),
                        {}
                    );
                    this.handshakeInfo = new HandshakeInfo(
                        antiCsrf,
                        response.accessTokenBlacklistingEnabled,
                        response.accessTokenValidity,
                        response.refreshTokenValidity,
                        response.jwtSigningPublicKeyList
                    );
                    this.updateJwtSigningPublicKeyInfo(
                        response.jwtSigningPublicKeyList,
                        response.jwtSigningPublicKey,
                        response.jwtSigningPublicKeyExpiryTime
                    );
                }
                return this.handshakeInfo;
            });
        /**
         * Update the cached list of signing keys
         * @param keyList The list of signing keys on the response object. Before 2.9 always undefined, after it always contains at least 1 key
         * @param publicKey The public key of the latest signing key
         * @param expiryTime The expiry time of the latest signing key
         */
        this.updateJwtSigningPublicKeyInfo = (keyList, publicKey, expiryTime) => {
            if (keyList === undefined) {
                // Setting createdAt to Date.now() emulates the old lastUpdatedAt logic
                keyList = [{ publicKey, expiryTime, createdAt: Date.now() }];
            }
            if (this.handshakeInfo !== undefined) {
                this.handshakeInfo.setJwtSigningPublicKeyList(keyList);
            }
        };
        this.getAccessTokenLifeTimeMS = () =>
            __awaiter(this, void 0, void 0, function* () {
                return (yield this.getHandshakeInfo()).accessTokenValidity;
            });
        this.getRefreshTokenLifeTimeMS = () =>
            __awaiter(this, void 0, void 0, function* () {
                return (yield this.getHandshakeInfo()).refreshTokenValidity;
            });
        this.querier = querier;
        this.config = config;
        this.isInServerlessEnv = isInServerlessEnv;
        // Solving the cold start problem
        this.getHandshakeInfo().catch((_) => {
            // ignored
        });
    }
}
exports.default = RecipeImplementation;
