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
const error_1 = require("./error");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const querier_1 = require("../../querier");
const supertokens_1 = require("../../supertokens");
const utils_1 = require("../../utils");
class Session {
    constructor(recipeImplementation, accessToken, sessionHandle, userId, userDataInJWT, res) {
        this.revokeSession = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (yield SessionFunctions.revokeSession(this.recipeImplementation, this.sessionHandle)) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                }
            });
        this.getSessionData = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(
                        supertokens_1.default.getInstanceOrThrowError().isInServerlessEnv
                    );
                    let apiVersion = yield querier.getAPIVersion();
                    // Call older function for < 2.8
                    if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                        return yield SessionFunctions.getSessionData(this.recipeImplementation, this.sessionHandle);
                    } else {
                        return yield (yield SessionFunctions.getSessionInformation(
                            this.recipeImplementation,
                            this.sessionHandle
                        )).userDataInDatabase;
                    }
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                    }
                    throw err;
                }
            });
        this.updateSessionData = (newSessionData) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    yield SessionFunctions.updateSessionData(
                        this.recipeImplementation,
                        this.sessionHandle,
                        newSessionData
                    );
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                    }
                    throw err;
                }
            });
        this.getUserId = () => {
            return this.userId;
        };
        this.getJWTPayload = () => {
            return this.userDataInJWT;
        };
        this.getHandle = () => {
            return this.sessionHandle;
        };
        this.getAccessToken = () => {
            return this.accessToken;
        };
        this.updateJWTPayload = (newJWTPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                newJWTPayload = newJWTPayload === null || newJWTPayload === undefined ? {} : newJWTPayload;
                let response = yield this.recipeImplementation.querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/session/regenerate"),
                    {
                        accessToken: this.accessToken,
                        userDataInJWT: newJWTPayload,
                    }
                );
                if (response.status === "UNAUTHORISED") {
                    cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                    throw new error_1.default({
                        message: "Session has probably been revoked while updating JWT payload",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                this.userDataInJWT = response.session.userDataInJWT;
                if (response.accessToken !== undefined) {
                    this.accessToken = response.accessToken.token;
                    cookieAndHeaders_1.setFrontTokenInHeaders(
                        this.res,
                        response.session.userId,
                        response.accessToken.expiry,
                        response.session.userDataInJWT
                    );
                    cookieAndHeaders_1.attachAccessTokenToCookie(
                        this.recipeImplementation.config,
                        this.res,
                        response.accessToken.token,
                        response.accessToken.expiry
                    );
                }
            });
        this.getTimeCreated = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(
                        supertokens_1.default.getInstanceOrThrowError().isInServerlessEnv
                    );
                    let apiVersion = yield querier.getAPIVersion();
                    if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                        throw new Error("Please use core version >= 3.5 to call this function.");
                    }
                    return (yield SessionFunctions.getSessionInformation(
                        this.recipeImplementation,
                        this.sessionHandle
                    )).timeCreated;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                    }
                    throw err;
                }
            });
        this.getExpiry = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(
                        supertokens_1.default.getInstanceOrThrowError().isInServerlessEnv
                    );
                    let apiVersion = yield querier.getAPIVersion();
                    if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                        throw new Error("Please use core version >= 3.5 to call this function.");
                    }
                    return (yield SessionFunctions.getSessionInformation(
                        this.recipeImplementation,
                        this.sessionHandle
                    )).expiry;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeImplementation.config, this.res);
                    }
                    throw err;
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
        this.recipeImplementation = recipeImplementation;
    }
}
exports.default = Session;
//# sourceMappingURL=sessionClass.js.map
