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
                logger_1.logDebugMessage("createNewSession: Started");
                let transferMethod = config.getTokenTransferMethod({ req, userContext });
                logger_1.logDebugMessage("createNewSession: got transfer method " + transferMethod);
                if (transferMethod === "MISSING_AUTH_HEADER") {
                    transferMethod = "header";
                }
                logger_1.logDebugMessage("createNewSession: using transfer method " + transferMethod);
                const disableAntiCSRF = transferMethod === "header";
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    userId,
                    disableAntiCSRF,
                    accessTokenPayload,
                    sessionData
                );
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, res, response, transferMethod);
                return new sessionClass_1.default(
                    helpers,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res,
                    req,
                    transferMethod
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
                const sessionOptional =
                    options !== undefined && typeof options !== "boolean" && options.sessionRequired === false;
                const gotRID = utils_2.frontendHasInterceptor(req);
                const method = req.getMethod();
                logger_1.logDebugMessage("getSession: optional validation: " + sessionOptional);
                logger_1.logDebugMessage("getSession: rid in header: " + gotRID);
                logger_1.logDebugMessage("getSession: request method: " + method);
                let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
                const preferredTransferMethod = config.getTokenTransferMethod({ req, userContext });
                let transferMethod =
                    preferredTransferMethod === "MISSING_AUTH_HEADER" ? "header" : preferredTransferMethod;
                let accessToken = cookieAndHeaders_1.getToken(req, "access", transferMethod);
                if (accessToken === undefined) {
                    const fallbackMethod = transferMethod === "cookie" ? "header" : "cookie";
                    // We are checking if we could've gone ahead with validation if the transferMethod was different
                    // However, we don't want to do the fallback here, but force a call to refresh
                    // This is done to ensure that the browsers update the transfermethod in a timely manner (basically on the next API call)
                    // instead of waiting for the session to expire
                    accessToken = cookieAndHeaders_1.getToken(req, "access", fallbackMethod);
                    if (accessToken !== undefined) {
                        if (preferredTransferMethod === "MISSING_AUTH_HEADER") {
                            transferMethod = fallbackMethod;
                            logger_1.logDebugMessage(
                                `getSession: falling back to use ${fallbackMethod} as an authentication-method`
                            );
                        } else {
                            logger_1.logDebugMessage(
                                `getSession: returning TRY_REFRESH_TOKEN because preferred auth-mode doesn't allow fallback and access token was sent with the wrong method`
                            );
                            throw new error_1.default({
                                message: "access token sent with the wrong method. Please call the refresh API",
                                type: error_1.default.TRY_REFRESH_TOKEN,
                            });
                        }
                    }
                }
                if (accessToken === undefined) {
                    // This is done here to ensure smooth migration of sessions started before removing the id-refresh-token
                    // This token isn't handled by getToken to limit the scope of this legacy/migration code
                    if (req.getCookieValue("sIRTFrontend") !== undefined) {
                        throw new error_1.default({
                            message: "access token expired, please call the refresh API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    }
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    if (sessionOptional) {
                        logger_1.logDebugMessage(
                            "getSession: returning undefined because accessToken is undefined and sessionRequired is false"
                        );
                        // there is no session that exists here, and the user wants session verification
                        // to be optional. So we return undefined.
                        return undefined;
                    }
                    logger_1.logDebugMessage("getSession: UNAUTHORISED because accessToken in request is undefined");
                    throw new error_1.default({
                        message:
                            "Session does not exist. Are you sending the session tokens in the request as cookies?",
                        type: error_1.default.UNAUTHORISED,
                    });
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
                            res,
                            "access",
                            response.accessToken.token,
                            // We set the expiration to 10 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                            // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                            // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                            // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                            Date.now() + 315360000000,
                            transferMethod
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
                        req,
                        transferMethod
                    );
                    return session;
                } catch (err) {
                    if (
                        err.type === error_1.default.TRY_REFRESH_TOKEN &&
                        sessionOptional &&
                        !gotRID &&
                        method !== "get"
                    ) {
                        return undefined;
                    }
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
                let outputTransferMethod = config.getTokenTransferMethod({ req, userContext });
                logger_1.logDebugMessage("refreshSession: Preferred transfer method: " + outputTransferMethod);
                let inputTransferMethod = outputTransferMethod;
                if (inputTransferMethod === "MISSING_AUTH_HEADER") {
                    inputTransferMethod = "header";
                }
                let inputRefreshToken = cookieAndHeaders_1.getToken(req, "refresh", inputTransferMethod);
                if (inputRefreshToken === undefined) {
                    inputTransferMethod = inputTransferMethod === "cookie" ? "header" : "cookie";
                    inputRefreshToken = cookieAndHeaders_1.getToken(req, "refresh", inputTransferMethod);
                }
                if (outputTransferMethod === "MISSING_AUTH_HEADER") {
                    outputTransferMethod = inputTransferMethod;
                }
                if (inputRefreshToken === undefined) {
                    logger_1.logDebugMessage(
                        "refreshSession: UNAUTHORISED because refresh token in request is undefined"
                    );
                    throw new error_1.default({
                        message:
                            "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                logger_1.logDebugMessage("refreshSession: Request used transfer method: " + inputRefreshToken);
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(
                        helpers,
                        inputRefreshToken,
                        antiCsrfToken,
                        utils_2.getRidFromHeader(req) !== undefined,
                        inputTransferMethod,
                        outputTransferMethod
                    );
                    logger_1.logDebugMessage(
                        "refreshSession: Attaching refreshed session info as " + outputTransferMethod
                    );
                    // This will get the preferred transfer method again, and intentionally not use the fallback
                    // See above for the reasoning
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(
                        config,
                        res,
                        response,
                        outputTransferMethod
                    );
                    logger_1.logDebugMessage("refreshSession: Success!");
                    return new sessionClass_1.default(
                        helpers,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res,
                        req,
                        outputTransferMethod
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
