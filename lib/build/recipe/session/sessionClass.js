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
const logger_1 = require("../../logger");
class Session {
    constructor(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res) {
        this.revokeSession = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.helpers.sessionRecipeImpl.revokeSession({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                // we do not check the output of calling revokeSession
                // before clearing the cookies because we are revoking the
                // current API request's session.
                // If we instead clear the cookies only when revokeSession
                // returns true, it can cause this kind of a bug:
                // https://github.com/supertokens/supertokens-node/issues/343
                cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
            });
        this.getSessionData = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInfo = yield this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
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
                    !(yield this.helpers.sessionRecipeImpl.updateSessionData({
                        sessionHandle: this.sessionHandle,
                        newSessionData,
                        userContext: userContext === undefined ? {} : userContext,
                    }))
                ) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
            });
        this.getUserId = () => {
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
                let sessionInfo = yield this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return sessionInfo.timeCreated;
            });
        this.getExpiry = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInfo = yield this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (sessionInfo === undefined) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    throw new error_1.default({
                        message: "Session does not exist anymore",
                        type: error_1.default.UNAUTHORISED,
                    });
                }
                return sessionInfo.expiry;
            });
        this.assertClaims = (claimValidators, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const origSessionClaimPayloadJSON = JSON.stringify(this.getAccessTokenPayload());
                let newAccessTokenPayload = this.getAccessTokenPayload();
                let validationErrors = [];
                for (const validator of claimValidators) {
                    logger_1.logDebugMessage("Session.validateClaims checking " + validator.id);
                    if ("claim" in validator && (yield validator.shouldRefetch(newAccessTokenPayload, userContext))) {
                        logger_1.logDebugMessage("Session.validateClaims refetching " + validator.id);
                        const value = yield validator.claim.fetchValue(this.getUserId(), userContext);
                        logger_1.logDebugMessage(
                            "Session.validateClaims " + validator.id + " refetch res " + JSON.stringify(value)
                        );
                        if (value !== undefined) {
                            newAccessTokenPayload = validator.claim.addToPayload_internal(
                                newAccessTokenPayload,
                                value,
                                userContext
                            );
                        }
                    }
                    const claimValidationResult = yield validator.validate(newAccessTokenPayload, userContext);
                    logger_1.logDebugMessage(
                        "Session.validateClaims " +
                            validator.id +
                            " validation res " +
                            JSON.stringify(claimValidationResult)
                    );
                    if (!claimValidationResult.isValid) {
                        validationErrors.push({
                            id: validator.id,
                            reason: claimValidationResult.reason,
                        });
                    }
                }
                if (JSON.stringify(newAccessTokenPayload) !== origSessionClaimPayloadJSON) {
                    yield this.mergeIntoAccessTokenPayload(newAccessTokenPayload, userContext);
                }
                if (validationErrors.length !== 0) {
                    throw new error_1.default({
                        type: "INVALID_CLAIMS",
                        message: "INVALID_CLAIMS",
                        payload: validationErrors,
                    });
                }
            });
        this.fetchAndSetClaim = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                const update = yield claim.build(this.getUserId(), userContext);
                return this.mergeIntoAccessTokenPayload(update, userContext);
            });
        this.setClaimValue = (claim, value, userContext) => {
            const update = claim.addToPayload_internal({}, value, userContext);
            return this.mergeIntoAccessTokenPayload(update, userContext);
        };
        this.getClaimValue = (claim, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                return claim.getValueFromPayload(yield this.getAccessTokenPayload(), userContext);
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
                let response = yield this.helpers.sessionRecipeImpl.regenerateAccessToken({
                    accessToken: this.getAccessToken(),
                    newAccessTokenPayload,
                    userContext: userContext === undefined ? {} : userContext,
                });
                if (response === undefined) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
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
                    cookieAndHeaders_1.attachAccessTokenToCookie(
                        this.helpers.config,
                        this.res,
                        response.accessToken.token,
                        response.accessToken.expiry
                    );
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.res = res;
        this.accessToken = accessToken;
        this.helpers = helpers;
    }
}
exports.default = Session;
