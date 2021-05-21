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
class RecipeImplementation {
    constructor(recipeInstance) {
        this.createNewSession = (res, userId, jwtPayload = {}, sessionData = {}) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield SessionFunctions.createNewSession(
                    this.recipeInstance,
                    userId,
                    jwtPayload,
                    sessionData
                );
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this.recipeInstance, res, response);
                return new sessionClass_1.default(
                    this.recipeInstance,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res
                );
            });
        this.getSession = (req, res, options) =>
            __awaiter(this, void 0, void 0, function* () {
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
                    throw new error_1.default({
                        message: "Access token has expired. Please call the refresh API",
                        type: error_1.default.TRY_REFRESH_TOKEN,
                    });
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    if (doAntiCsrfCheck === undefined) {
                        doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.method) !== "get";
                    }
                    let response = yield SessionFunctions.getSession(
                        this.recipeInstance,
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
                            this.recipeInstance,
                            res,
                            response.accessToken.token,
                            response.accessToken.expiry
                        );
                        accessToken = response.accessToken.token;
                    }
                    return new sessionClass_1.default(
                        this.recipeInstance,
                        accessToken,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res
                    );
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, res);
                    }
                    throw err;
                }
            });
        this.refreshSession = (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
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
                        this.recipeInstance,
                        inputRefreshToken,
                        antiCsrfToken,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this.recipeInstance, res, response);
                    return new sessionClass_1.default(
                        this.recipeInstance,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        res
                    );
                } catch (err) {
                    if (
                        err.type === error_1.default.UNAUTHORISED ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, res);
                    }
                    throw err;
                }
            });
        this.revokeAllSessionsForUser = (userId) => {
            return SessionFunctions.revokeAllSessionsForUser(this.recipeInstance, userId);
        };
        this.getAllSessionHandlesForUser = (userId) => {
            return SessionFunctions.getAllSessionHandlesForUser(this.recipeInstance, userId);
        };
        this.revokeSession = (sessionHandle) => {
            return SessionFunctions.revokeSession(this.recipeInstance, sessionHandle);
        };
        this.revokeMultipleSessions = (sessionHandles) => {
            return SessionFunctions.revokeMultipleSessions(this.recipeInstance, sessionHandles);
        };
        this.getSessionData = (sessionHandle) => {
            return SessionFunctions.getSessionData(this.recipeInstance, sessionHandle);
        };
        this.updateSessionData = (sessionHandle, newSessionData) => {
            return SessionFunctions.updateSessionData(this.recipeInstance, sessionHandle, newSessionData);
        };
        this.getJWTPayload = (sessionHandle) => {
            return SessionFunctions.getJWTPayload(this.recipeInstance, sessionHandle);
        };
        this.updateJWTPayload = (sessionHandle, newJWTPayload) => {
            return SessionFunctions.updateJWTPayload(this.recipeInstance, sessionHandle, newJWTPayload);
        };
        this.recipeInstance = recipeInstance;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
