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
// We are defining this here to reduce the scope of legacy code
const LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME = "sIdRefreshToken";
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
                let outputTransferMethod = config.getTokenTransferMethod({ req, userContext });
                logger_1.logDebugMessage("createNewSession: got transfer method " + outputTransferMethod);
                if (outputTransferMethod === "missing_auth_header") {
                    outputTransferMethod = "header";
                }
                logger_1.logDebugMessage("createNewSession: using transfer method " + outputTransferMethod);
                const disableAntiCSRF = outputTransferMethod === "header";
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    userId,
                    disableAntiCSRF,
                    accessTokenPayload,
                    sessionData
                );
                for (const transferMethod of cookieAndHeaders_1.availableTokenTransferMethods) {
                    if (transferMethod !== outputTransferMethod) {
                        cookieAndHeaders_1.clearSession(config, req, res, userContext, transferMethod);
                    }
                }
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(config, res, response, outputTransferMethod);
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
            });
        },
        getGlobalClaimValidators: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return input.claimValidatorsAddedByOtherRecipes;
            });
        },
        /* In all cases if sIdRefreshToken token exists (so it's a legacy session) we return TRY_REFRESH_TOKEN. The refresh endpoint will clear this cookie and try to upgrade the session.
           Check https://supertokens.com/docs/contribute/decisions/session/0007 for further details and a table of expected behaviours
         */
        getSession: function ({ req, res, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger_1.logDebugMessage("getSession: Started");
                // This token isn't handled by getToken to limit the scope of this legacy/migration code
                if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                    // This could create a spike on refresh calls during the update of the backend SDK
                    throw new error_1.default({
                        message: "using legacy session, please call the refresh API",
                        type: error_1.default.TRY_REFRESH_TOKEN,
                    });
                }
                const sessionOptional =
                    (options === null || options === void 0 ? void 0 : options.sessionRequired) === false;
                logger_1.logDebugMessage("getSession: optional validation: " + sessionOptional);
                const preferredTransferMethod = config.getTokenTransferMethod({ req, userContext });
                let transferMethod =
                    preferredTransferMethod === "missing_auth_header" ? "header" : preferredTransferMethod;
                let accessToken = cookieAndHeaders_1.getToken(req, "access", transferMethod);
                if (accessToken === undefined) {
                    const fallbackMethod = transferMethod === "cookie" ? "header" : "cookie";
                    // We are checking if we could go ahead with validation if the transferMethod was different
                    // However, we don't want to allow fallback here if there is an up-to-date frontend SDK that sends the auth-mode header.
                    accessToken = cookieAndHeaders_1.getToken(req, "access", fallbackMethod);
                    if (accessToken !== undefined) {
                        if (preferredTransferMethod === "missing_auth_header") {
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
                    let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
                    if (doAntiCsrfCheck === undefined) {
                        doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.getMethod()) !== "get";
                    }
                    if (transferMethod === "header") {
                        doAntiCsrfCheck = false;
                    }
                    logger_1.logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);
                    let response = yield SessionFunctions.getSession(
                        helpers,
                        accessToken,
                        antiCsrfToken,
                        doAntiCsrfCheck,
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
                            // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                            // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                            // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                            // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                            Date.now() + 3153600000000,
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
        /*
            In all cases: if sIdRefreshToken token exists (so it's a legacy session) we clear it.
            Check http://localhost:3002/docs/contribute/decisions/session/0008 for further details and a table of expected behaviours
         */
        refreshSession: function ({ req, res, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger_1.logDebugMessage("refreshSession: Started");
                // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                    cookieAndHeaders_1.setCookie(
                        config,
                        res,
                        LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                        "",
                        0,
                        "accessTokenPath"
                    );
                }
                const refreshTokens = {};
                // We check all token transfer methods for available refresh tokens
                // We do this so that we can later clear all we are not overwrite
                for (const transferMethod of cookieAndHeaders_1.availableTokenTransferMethods) {
                    refreshTokens[transferMethod] = cookieAndHeaders_1.getToken(req, "refresh", transferMethod);
                    if (refreshTokens[transferMethod] !== undefined) {
                        logger_1.logDebugMessage("refreshSession: got refresh token from " + transferMethod);
                    }
                }
                let requestTransferMethod;
                if (refreshTokens["header"] !== undefined) {
                    logger_1.logDebugMessage("refreshSession: using header transfer method");
                    requestTransferMethod = "header";
                } else if (refreshTokens["cookie"]) {
                    logger_1.logDebugMessage("refreshSession: using header transfer method");
                    requestTransferMethod = "cookie";
                } else {
                    logger_1.logDebugMessage(
                        "refreshSession: UNAUTHORISED because refresh token in request is undefined"
                    );
                    throw new error_1.default({
                        message:
                            "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(
                        helpers,
                        requestTransferMethod,
                        antiCsrfToken,
                        utils_2.getRidFromHeader(req) !== undefined,
                        requestTransferMethod
                    );
                    logger_1.logDebugMessage(
                        "refreshSession: Attaching refreshed session info as " + requestTransferMethod
                    );
                    // We clear the tokens in all token transfer methods we are not going to overwrite
                    for (const transferMethod of cookieAndHeaders_1.availableTokenTransferMethods) {
                        if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
                            cookieAndHeaders_1.clearSession(config, req, res, userContext, transferMethod);
                        }
                    }
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(
                        config,
                        res,
                        response,
                        requestTransferMethod
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
                        requestTransferMethod
                    );
                } catch (err) {
                    if (
                        (err.type === error_1.default.UNAUTHORISED && err.payload.clearTokens) ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        logger_1.logDebugMessage(
                            "refreshSession: Clearing cookies because of UNAUTHORISED or TOKEN_THEFT_DETECTED response"
                        );
                        cookieAndHeaders_1.clearSession(config, req, res, userContext, requestTransferMethod);
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
