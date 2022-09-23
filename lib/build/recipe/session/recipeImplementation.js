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
const logger_1 = require("../../logger");
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
function getRecipeInterface(querier, config, appInfo, getRecipeImplAfterOverrides) {
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
        createNewSession: function ({ req, res, userId, accessTokenPayload = {}, sessionData = {}, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const disableAntiCSRF = config.getTokenTransferMethod({ req, userContext }) === "header";
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    userId,
                    disableAntiCSRF,
                    accessTokenPayload,
                    sessionData
                );
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, req, res, response, userContext);
                return new sessionClass_1.default(
                    helpers,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res,
                    req
                );
            });
        },
        getGlobalClaimValidators: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return input.claimValidatorsAddedByOtherRecipes;
            });
        },
        getSession: function ({ req, res, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger_1.logDebugMessage("getSession: Started");
                logger_1.logDebugMessage("getSession: rid in header: " + utils_2.frontendHasInterceptor(req));
                logger_1.logDebugMessage("getSession: request method: " + req.getMethod());
                let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
                const transferMethod = config.getTokenTransferMethod({ req, userContext });
                let idRefreshToken = cookieAndHeaders_1.getToken(config, req, "idRefresh", userContext, transferMethod);
                if (idRefreshToken === undefined) {
                    // We are checking if we could've gone ahead with validation if the transferMethod was different
                    // However, we don't want to do the fallback here, but force a call to refresh
                    // This is done to ensure that the browsers update the transfermethod in a timely manner (basically on the next API call)
                    // instead of waiting for the session to expire
                    idRefreshToken = cookieAndHeaders_1.getToken(
                        config,
                        req,
                        "idRefresh",
                        userContext,
                        transferMethod === "cookie" ? "header" : "cookie"
                    );
                    if (idRefreshToken !== undefined) {
                        logger_1.logDebugMessage(
                            "getSession: Returning try refresh token because idRefresh token were not sent as a " +
                                transferMethod
                        );
                        throw new error_1.default({
                            message: "idRefreshToken sent with the wrong method. Please call the refresh API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    }
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                        logger_1.logDebugMessage(
                            "getSession: returning undefined because idRefreshToken is undefined and sessionRequired is false"
                        );
                        // there is no session that exists here, and the user wants session verification
                        // to be optional. So we return undefined.
                        return undefined;
                    }
                    logger_1.logDebugMessage(
                        "getSession: UNAUTHORISED because idRefreshToken from cookies is undefined"
                    );
                    throw new error_1.default({
                        message:
                            "Session does not exist. Are you sending the session tokens in the request as cookies?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                let accessToken = cookieAndHeaders_1.getToken(config, req, "access", userContext, transferMethod);
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
                        logger_1.logDebugMessage(
                            "getSession: Returning try refresh token because access token from cookies is undefined"
                        );
                        throw new error_1.default({
                            message: "Access token has expired. Please call the refresh API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    }
                    return undefined;
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    const disableAntiCSRF = transferMethod === "header";
                    if (doAntiCsrfCheck === undefined) {
                        doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.getMethod()) !== "get";
                    }
                    logger_1.logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);
                    let response = yield SessionFunctions.getSession(
                        helpers,
                        accessToken,
                        antiCsrfToken,
                        !disableAntiCSRF && doAntiCsrfCheck,
                        utils_2.getRidFromHeader(req) !== undefined
                    );
                    if (response.accessToken !== undefined) {
                        cookieAndHeaders_1.setFrontTokenInHeaders(
                            res,
                            response.session.userId,
                            response.accessToken.expiry,
                            response.session.userDataInJWT
                        );
                        cookieAndHeaders_1.setToken(
                            config,
                            req,
                            res,
                            "access",
                            response.accessToken.token,
                            response.accessToken.expiry,
                            userContext
                        );
                        accessToken = response.accessToken.token;
                    }
                    logger_1.logDebugMessage("getSession: Success!");
                    const session = new sessionClass_1.default(
                        helpers,
                        accessToken,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res,
                        req
                    );
                    return session;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        logger_1.logDebugMessage("getSession: Clearing cookies because of UNAUTHORISED response");
                        cookieAndHeaders_1.clearSession(config, req, res, userContext);
                    }
                    throw err;
                }
            });
        },
        validateClaims: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessTokenPayload = input.accessTokenPayload;
                let accessTokenPayloadUpdate = undefined;
                const origSessionClaimPayloadJSON = JSON.stringify(accessTokenPayload);
                for (const validator of input.claimValidators) {
                    logger_1.logDebugMessage(
                        "updateClaimsInPayloadIfNeeded checking shouldRefetch for " + validator.id
                    );
                    if (
                        "claim" in validator &&
                        (yield validator.shouldRefetch(accessTokenPayload, input.userContext))
                    ) {
                        logger_1.logDebugMessage("updateClaimsInPayloadIfNeeded refetching " + validator.id);
                        const value = yield validator.claim.fetchValue(input.userId, input.userContext);
                        logger_1.logDebugMessage(
                            "updateClaimsInPayloadIfNeeded " + validator.id + " refetch result " + JSON.stringify(value)
                        );
                        if (value !== undefined) {
                            accessTokenPayload = validator.claim.addToPayload_internal(
                                accessTokenPayload,
                                value,
                                input.userContext
                            );
                        }
                    }
                }
                if (JSON.stringify(accessTokenPayload) !== origSessionClaimPayloadJSON) {
                    accessTokenPayloadUpdate = accessTokenPayload;
                }
                const invalidClaims = yield utils_1.validateClaimsInPayload(
                    input.claimValidators,
                    accessTokenPayload,
                    input.userContext
                );
                return {
                    invalidClaims,
                    accessTokenPayloadUpdate,
                };
            });
        },
        validateClaimsInJWTPayload: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                // We skip refetching here, because we have no way of updating the JWT payload here
                // if we have access to the entire session other methods can be used to do validation while updating
                const invalidClaims = yield utils_1.validateClaimsInPayload(
                    input.claimValidators,
                    input.jwtPayload,
                    input.userContext
                );
                return {
                    status: "OK",
                    invalidClaims,
                };
            });
        },
        getSessionInformation: function ({ sessionHandle }) {
            return __awaiter(this, void 0, void 0, function* () {
                return SessionFunctions.getSessionInformation(helpers, sessionHandle);
            });
        },
        refreshSession: function ({ req, res, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger_1.logDebugMessage("refreshSession: Started");
                // We use a fallback mechanism here, to ensure there is a smooth upgrade path when switching transfer methods
                // We only use it here and not while getting/validating sessions, because we want to "force" clients to upgrade
                const outputTransferMethod = config.getTokenTransferMethod({ req, userContext });
                let inputTransferMethod = outputTransferMethod;
                let inputIdRefreshToken = cookieAndHeaders_1.getToken(
                    config,
                    req,
                    "idRefresh",
                    userContext,
                    inputTransferMethod
                );
                if (inputIdRefreshToken === undefined) {
                    inputTransferMethod = inputTransferMethod === "cookie" ? "header" : "cookie";
                    inputIdRefreshToken = cookieAndHeaders_1.getToken(
                        config,
                        req,
                        "idRefresh",
                        userContext,
                        inputTransferMethod
                    );
                }
                if (inputIdRefreshToken === undefined) {
                    logger_1.logDebugMessage(
                        "refreshSession: UNAUTHORISED because idRefreshToken from cookies is undefined"
                    );
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    throw new error_1.default({
                        message:
                            "Session does not exist. Are you sending the session tokens in the request as cookies?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                try {
                    let inputRefreshToken = cookieAndHeaders_1.getToken(
                        config,
                        req,
                        "refresh",
                        userContext,
                        inputTransferMethod
                    );
                    if (inputRefreshToken === undefined) {
                        logger_1.logDebugMessage(
                            "refreshSession: UNAUTHORISED because refresh token from cookies is undefined"
                        );
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
                        utils_2.getRidFromHeader(req) !== undefined,
                        inputTransferMethod,
                        outputTransferMethod
                    );
                    // This will get the preferred transfer method again, and intentionally not use the fallback
                    // See above for the reasoning
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, req, res, response, userContext);
                    logger_1.logDebugMessage("refreshSession: Success!");
                    return new sessionClass_1.default(
                        helpers,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res,
                        req
                    );
                } catch (err) {
                    if (
                        (err.type === error_1.default.UNAUTHORISED && err.payload.clearTokens) ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        logger_1.logDebugMessage(
                            "refreshSession: Clearing cookies because of UNAUTHORISED or TOKEN_THEFT_DETECTED response"
                        );
                        cookieAndHeaders_1.clearSession(config, req, res, userContext);
                    }
                    throw err;
                }
            });
        },
        regenerateAccessToken: function (input) {
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
                    }
                );
                if (response.status === "UNAUTHORISED") {
                    return undefined;
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
        mergeIntoAccessTokenPayload: function ({ sessionHandle, accessTokenPayloadUpdate, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const sessionInfo = yield this.getSessionInformation({ sessionHandle, userContext });
                if (sessionInfo === undefined) {
                    return false;
                }
                const newAccessTokenPayload = Object.assign(
                    Object.assign({}, sessionInfo.accessTokenPayload),
                    accessTokenPayloadUpdate
                );
                for (const key of Object.keys(accessTokenPayloadUpdate)) {
                    if (accessTokenPayloadUpdate[key] === null) {
                        delete newAccessTokenPayload[key];
                    }
                }
                return this.updateAccessTokenPayload({ sessionHandle, newAccessTokenPayload, userContext });
            });
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
        fetchAndSetClaim: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const sessionInfo = yield this.getSessionInformation({
                    sessionHandle: input.sessionHandle,
                    userContext: input.userContext,
                });
                if (sessionInfo === undefined) {
                    return false;
                }
                const accessTokenPayloadUpdate = yield input.claim.build(sessionInfo.userId, input.userContext);
                return this.mergeIntoAccessTokenPayload({
                    sessionHandle: input.sessionHandle,
                    accessTokenPayloadUpdate,
                    userContext: input.userContext,
                });
            });
        },
        setClaimValue: function (input) {
            const accessTokenPayloadUpdate = input.claim.addToPayload_internal({}, input.value, input.userContext);
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },
        getClaimValue: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const sessionInfo = yield this.getSessionInformation({
                    sessionHandle: input.sessionHandle,
                    userContext: input.userContext,
                });
                if (sessionInfo === undefined) {
                    return {
                        status: "SESSION_DOES_NOT_EXIST_ERROR",
                    };
                }
                return {
                    status: "OK",
                    value: input.claim.getValueFromPayload(sessionInfo.accessTokenPayload, input.userContext),
                };
            });
        },
        removeClaim: function (input) {
            const accessTokenPayloadUpdate = input.claim.removeFromPayloadByMerge_internal({}, input.userContext);
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },
    };
    let helpers = {
        querier,
        updateJwtSigningPublicKeyInfo,
        getHandshakeInfo,
        config,
        appInfo,
        getRecipeImpl: getRecipeImplAfterOverrides,
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
