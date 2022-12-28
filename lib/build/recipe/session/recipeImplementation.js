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
const constants_1 = require("./constants");
const jwt_1 = require("./jwt");
const accessToken_1 = require("./accessToken");
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
                let outputTransferMethod = config.getTokenTransferMethod({
                    req,
                    forCreateNewSession: true,
                    userContext,
                });
                if (outputTransferMethod === "any") {
                    outputTransferMethod = "header";
                }
                logger_1.logDebugMessage("createNewSession: using transfer method " + outputTransferMethod);
                if (
                    outputTransferMethod === "cookie" &&
                    helpers.config.cookieSameSite === "none" &&
                    !helpers.config.cookieSecure &&
                    !(
                        (helpers.appInfo.topLevelAPIDomain === "localhost" ||
                            utils_2.isAnIpAddress(helpers.appInfo.topLevelAPIDomain)) &&
                        (helpers.appInfo.topLevelWebsiteDomain === "localhost" ||
                            utils_2.isAnIpAddress(helpers.appInfo.topLevelWebsiteDomain))
                    )
                ) {
                    // We can allow insecure cookie when both website & API domain are localhost or an IP
                    // When either of them is a different domain, API domain needs to have https and a secure cookie to work
                    throw new Error(
                        "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                    );
                }
                const disableAntiCSRF = outputTransferMethod === "header";
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    userId,
                    disableAntiCSRF,
                    accessTokenPayload,
                    sessionData
                );
                for (const transferMethod of constants_1.availableTokenTransferMethods) {
                    if (
                        transferMethod !== outputTransferMethod &&
                        cookieAndHeaders_1.getToken(req, "access", transferMethod) !== undefined
                    ) {
                        cookieAndHeaders_1.clearSession(config, res, transferMethod);
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
                const accessTokens = {};
                // We check all token transfer methods for available access tokens
                for (const transferMethod of constants_1.availableTokenTransferMethods) {
                    const tokenString = cookieAndHeaders_1.getToken(req, "access", transferMethod);
                    if (tokenString !== undefined) {
                        try {
                            const info = jwt_1.parseJWTWithoutSignatureVerification(tokenString);
                            accessToken_1.validateAccessTokenStructure(info.payload);
                            logger_1.logDebugMessage("getSession: got access token from " + transferMethod);
                            accessTokens[transferMethod] = info;
                        } catch (_a) {
                            logger_1.logDebugMessage(
                                `getSession: ignoring token in ${transferMethod}, because it doesn't match our access token structure`
                            );
                        }
                    }
                }
                const allowedTransferMethod = config.getTokenTransferMethod({
                    req,
                    forCreateNewSession: false,
                    userContext,
                });
                let requestTransferMethod;
                let accessToken;
                if (
                    (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
                    accessTokens["header"] !== undefined
                ) {
                    logger_1.logDebugMessage("getSession: using header transfer method");
                    requestTransferMethod = "header";
                    accessToken = accessTokens["header"];
                } else if (
                    (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
                    accessTokens["cookie"] !== undefined
                ) {
                    logger_1.logDebugMessage("getSession: using cookie transfer method");
                    requestTransferMethod = "cookie";
                    accessToken = accessTokens["cookie"];
                } else {
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
                            "Session does not exist. Are you sending the session tokens in the request with the appropriate token transfer method?",
                        type: error_1.default.UNAUTHORISED,
                        payload: {
                            // we do not clear the session here because of a
                            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                            clearTokens: false,
                        },
                    });
                }
                let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
                if (doAntiCsrfCheck === undefined) {
                    doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.getMethod()) !== "get";
                }
                if (requestTransferMethod === "header") {
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
                let accessTokenString = accessToken.rawTokenString;
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
                        requestTransferMethod
                    );
                    accessTokenString = response.accessToken.token;
                }
                logger_1.logDebugMessage("getSession: Success!");
                const session = new sessionClass_1.default(
                    helpers,
                    accessTokenString,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res,
                    req,
                    requestTransferMethod
                );
                return session;
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
                const refreshTokens = {};
                // We check all token transfer methods for available refresh tokens
                // We do this so that we can later clear all we are not overwriting
                for (const transferMethod of constants_1.availableTokenTransferMethods) {
                    refreshTokens[transferMethod] = cookieAndHeaders_1.getToken(req, "refresh", transferMethod);
                    if (refreshTokens[transferMethod] !== undefined) {
                        logger_1.logDebugMessage("refreshSession: got refresh token from " + transferMethod);
                    }
                }
                const allowedTransferMethod = config.getTokenTransferMethod({
                    req,
                    forCreateNewSession: false,
                    userContext,
                });
                logger_1.logDebugMessage("refreshSession: getTokenTransferMethod returned " + allowedTransferMethod);
                let requestTransferMethod;
                let refreshToken;
                if (
                    (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
                    refreshTokens["header"] !== undefined
                ) {
                    logger_1.logDebugMessage("refreshSession: using header transfer method");
                    requestTransferMethod = "header";
                    refreshToken = refreshTokens["header"];
                } else if (
                    (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
                    refreshTokens["cookie"]
                ) {
                    logger_1.logDebugMessage("refreshSession: using cookie transfer method");
                    requestTransferMethod = "cookie";
                    refreshToken = refreshTokens["cookie"];
                } else {
                    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                        logger_1.logDebugMessage(
                            "refreshSession: cleared legacy id refresh token because refresh token was not found"
                        );
                        cookieAndHeaders_1.setCookie(
                            config,
                            res,
                            LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                            "",
                            0,
                            "accessTokenPath"
                        );
                    }
                    logger_1.logDebugMessage(
                        "refreshSession: UNAUTHORISED because refresh token in request is undefined"
                    );
                    throw new error_1.default({
                        message: "Refresh token not found. Are you sending the refresh token in the request?",
                        payload: {
                            clearTokens: false,
                        },
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(
                        helpers,
                        refreshToken,
                        antiCsrfToken,
                        utils_2.getRidFromHeader(req) !== undefined,
                        requestTransferMethod
                    );
                    logger_1.logDebugMessage(
                        "refreshSession: Attaching refreshed session info as " + requestTransferMethod
                    );
                    // We clear the tokens in all token transfer methods we are not going to overwrite
                    for (const transferMethod of constants_1.availableTokenTransferMethods) {
                        if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
                            cookieAndHeaders_1.clearSession(config, res, transferMethod);
                        }
                    }
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(
                        config,
                        res,
                        response,
                        requestTransferMethod
                    );
                    logger_1.logDebugMessage("refreshSession: Success!");
                    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                        logger_1.logDebugMessage(
                            "refreshSession: cleared legacy id refresh token after successful refresh"
                        );
                        cookieAndHeaders_1.setCookie(
                            config,
                            res,
                            LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                            "",
                            0,
                            "accessTokenPath"
                        );
                    }
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
                    if (err.type === error_1.default.TOKEN_THEFT_DETECTED || err.payload.clearTokens) {
                        // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                        if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                            logger_1.logDebugMessage(
                                "refreshSession: cleared legacy id refresh token because refresh is clearing other tokens"
                            );
                            cookieAndHeaders_1.setCookie(
                                config,
                                res,
                                LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                                "",
                                0,
                                "accessTokenPath"
                            );
                        }
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
