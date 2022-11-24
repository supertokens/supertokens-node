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
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = require("./error");
class Session {
    constructor(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res, req, transferMethod) {
        this.helpers = helpers;
        this.accessToken = accessToken;
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.res = res;
        this.req = req;
        this.transferMethod = transferMethod;
        this.revokeSession = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.helpers.getRecipeImpl().revokeSession({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                // we do not check the output of calling revokeSession
                // before clearing the cookies because we are revoking the
                // current API request's session.
                // If we instead clear the cookies only when revokeSession
                // returns true, it can cause this kind of a bug:
                // https://github.com/supertokens/supertokens-node/issues/343
                cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
            });
        this.getSessionData = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return sessionInfo.sessionData;
            });
        this.updateSessionData = (newSessionData, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                if (
                    !(yield this.helpers.getRecipeImpl().updateSessionData({
                        sessionHandle: this.sessionHandle,
                        newSessionData,
                        userContext: userContext === undefined ? {} : userContext,
                    }))
                ) {
                    cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
            });
        this.getUserId = (_userContext) => {
            return this.userId;
        };
        this.getAccessTokenPayload = (_userContext) => {
            return this.userDataInAccessToken;
        };
        this.getHandle = () => {
            return this.sessionHandle;
        };
        this.getAccessToken = () => {
            return this.accessToken;
        };
        this.mergeIntoAccessTokenPayload = (accessTokenPayloadUpdate, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const updatedPayload = Object.assign(
                    Object.assign({}, this.getAccessTokenPayload(userContext)),
                    accessTokenPayloadUpdate
                );
                for (const key of Object.keys(accessTokenPayloadUpdate)) {
                    if (accessTokenPayloadUpdate[key] === null) {
                        delete updatedPayload[key];
                    }
                }
                yield this.updateAccessTokenPayload(updatedPayload, userContext);
            });
        this.getTimeCreated = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return sessionInfo.timeCreated;
            });
        this.getExpiry = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return sessionInfo.expiry;
            });
        this.assertClaims = (claimValidators, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let validateClaimResponse = yield this.helpers.getRecipeImpl().validateClaims({
                    accessTokenPayload: this.getAccessTokenPayload(userContext),
                    userId: this.getUserId(userContext),
                    claimValidators,
                    userContext,
                });
                if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
                    yield this.mergeIntoAccessTokenPayload(validateClaimResponse.accessTokenPayloadUpdate, userContext);
                }
                if (validateClaimResponse.invalidClaims.length !== 0) {
                    throw new error_1.default({
                        type: "INVALID_CLAIMS",
                        message: "INVALID_CLAIMS",
                        payload: validateClaimResponse.invalidClaims,
                    });
                }
            });
        this.fetchAndSetClaim = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const update = yield claim.build(this.getUserId(userContext), userContext);
                return this.mergeIntoAccessTokenPayload(update, userContext);
            });
        this.setClaimValue = (claim, value, userContext) => {
            const update = claim.addToPayload_internal({}, value, userContext);
            return this.mergeIntoAccessTokenPayload(update, userContext);
        };
        this.getClaimValue = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                return claim.getValueFromPayload(yield this.getAccessTokenPayload(userContext), userContext);
            });
        this.removeClaim = (claim, userContext) => {
            const update = claim.removeFromPayloadByMerge_internal({}, userContext);
            return this.mergeIntoAccessTokenPayload(update, userContext);
        };
        /**
         * @deprecated Use mergeIntoAccessTokenPayload
         */
        this.updateAccessTokenPayload = (newAccessTokenPayload, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.helpers.getRecipeImpl().regenerateAccessToken({
                    accessToken: this.getAccessToken(),
                    newAccessTokenPayload,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (response === undefined) {
                    cookieAndHeaders_1.clearSession(this.helpers.config, this.req, this.res, this.transferMethod);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                this.userDataInAccessToken = response.session.userDataInJWT;
                if (response.accessToken !== undefined) {
                    this.accessToken = response.accessToken.token;
                    cookieAndHeaders_1.setFrontTokenInHeaders(
                        this.res,
                        response.session.userId,
                        response.accessToken.expiry,
                        response.session.userDataInJWT
                    );
                    cookieAndHeaders_1.setToken(
                        this.helpers.config,
                        this.res,
                        "access",
                        response.accessToken.token,
                        // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                        // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                        // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                        // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                        Date.now() + 3153600000000,
                        this.transferMethod
                    );
                }
            });
    }
}
exports.default = Session;
