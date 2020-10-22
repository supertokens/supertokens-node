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
class Session {
    constructor(recipeInstance, accessToken, sessionHandle, userId, userDataInJWT, accessTokenExpiry, res) {
        // TODO: remove when handshakeInfo has accessToken lifetime param
        this.getAccessTokenExpiry = () => {
            return this.accessTokenExpiry;
        };
        /**
         * @description call this to logout the current user.
         * This only invalidates the refresh token. The access token can still be used after
         * @sideEffect may clear cookies from response.
         * @throw AuthError GENERAL_ERROR
         */
        this.revokeSession = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (yield SessionFunctions.revokeSession(this.recipeInstance, this.sessionHandle)) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, this.res);
                }
            });
        /**
         * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
         * @returns session data as provided by the user earlier
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.getSessionData = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield SessionFunctions.getSessionData(this.recipeInstance, this.sessionHandle);
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, this.res);
                    }
                    throw err;
                }
            });
        /**
         * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.updateSessionData = (newSessionData) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    yield SessionFunctions.updateSessionData(this.recipeInstance, this.sessionHandle, newSessionData);
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, this.res);
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
                let response = yield this.recipeInstance.getQuerier().sendPostRequest("/session/regenerate", {
                    accessToken: this.accessToken,
                    userDataInJWT: newJWTPayload,
                });
                if (response.status === "UNAUTHORISED") {
                    cookieAndHeaders_1.clearSessionFromCookie(this.recipeInstance, this.res);
                    throw new error_1.default(
                        {
                            message: "Session has probably been revoked while updating JWT payload",
                            type: error_1.default.UNAUTHORISED,
                        },
                        this.recipeInstance.getRecipeId()
                    );
                }
                this.userDataInJWT = response.session.userDataInJWT;
                if (response.accessToken !== undefined) {
                    this.accessToken = response.accessToken.token;
                    cookieAndHeaders_1.setFrontTokenInHeaders(
                        this.recipeInstance,
                        this.res,
                        response.session.userId,
                        response.accessToken.expiry,
                        response.session.userDataInJWT
                    );
                    cookieAndHeaders_1.attachAccessTokenToCookie(
                        this.recipeInstance,
                        this.res,
                        response.accessToken.token,
                        response.accessToken.expiry
                    );
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
        this.accessTokenExpiry = accessTokenExpiry;
        this.recipeInstance = recipeInstance;
    }
}
exports.default = Session;
//# sourceMappingURL=sessionClass.js.map
