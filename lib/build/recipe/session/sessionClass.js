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
    constructor(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res) {
        this.revokeSession = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                if (
                    yield this.helpers.sessionRecipeImpl.revokeSession({
                        sessionHandle: this.sessionHandle,
                        userContext: userContext === undefined ? {} : userContext,
                    })
                ) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                }
            });
        this.getSessionData = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    return (yield this.helpers.sessionRecipeImpl.getSessionInformation({
                        sessionHandle: this.sessionHandle,
                        userContext: userContext === undefined ? {} : userContext,
                    })).sessionData;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    }
                    throw err;
                }
            });
        this.updateSessionData = (newSessionData, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.helpers.sessionRecipeImpl.updateSessionData({
                        sessionHandle: this.sessionHandle,
                        newSessionData,
                        userContext: userContext === undefined ? {} : userContext,
                    });
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    }
                    throw err;
                }
            });
        this.getUserId = () => {
            return this.userId;
        };
        this.getAccessTokenPayload = () => {
            return this.userDataInAccessToken;
        };
        this.getHandle = () => {
            return this.sessionHandle;
        };
        this.getAccessToken = () => {
            return this.accessToken;
        };
        this.updateAccessTokenPayload = (newAccessTokenPayload, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.regenerateToken(newAccessTokenPayload, userContext);
            });
        this.getTimeCreated = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    return (yield this.helpers.sessionRecipeImpl.getSessionInformation({
                        sessionHandle: this.sessionHandle,
                        userContext: userContext === undefined ? {} : userContext,
                    })).timeCreated;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    }
                    throw err;
                }
            });
        this.getExpiry = (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    return (yield this.helpers.sessionRecipeImpl.getSessionInformation({
                        sessionHandle: this.sessionHandle,
                        userContext: userContext === undefined ? {} : userContext,
                    })).expiry;
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                    }
                    throw err;
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.res = res;
        this.accessToken = accessToken;
        this.helpers = helpers;
    }
    updateClaim(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateClaims([claim], userContext);
        });
    }
    updateClaims(claims, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const origSessionClaimPayloadJSON = JSON.stringify(this.getAccessTokenPayload());
            let newAccessTokenPayload = this.getAccessTokenPayload();
            for (const claim of claims) {
                const value = yield claim.fetch(this.getUserId(), userContext);
                if (value !== undefined) {
                    newAccessTokenPayload = claim.addToPayload(newAccessTokenPayload, value, userContext);
                }
            }
            if (JSON.stringify(newAccessTokenPayload) !== origSessionClaimPayloadJSON) {
                yield this.regenerateToken(newAccessTokenPayload, userContext);
            }
        });
    }
    checkClaim(claimChecker, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.checkClaims([claimChecker], userContext)) !== undefined;
        });
    }
    checkClaims(claimCheckers, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const origSessionClaimPayloadJSON = JSON.stringify(this.getAccessTokenPayload());
            let newAccessTokenPayload = this.getAccessTokenPayload();
            let missingClaimId = undefined;
            for (const checker of claimCheckers) {
                if ("claim" in checker && (yield checker.shouldRefetch(newAccessTokenPayload, userContext))) {
                    const value = yield checker.claim.fetch(this.getUserId(), userContext);
                    if (value !== undefined) {
                        newAccessTokenPayload = checker.claim.addToPayload(newAccessTokenPayload, value, userContext);
                    }
                }
                console.log(
                    "checking",
                    "claim" in checker ? checker.claim.id : checker.claimId,
                    yield checker.isValid(newAccessTokenPayload, userContext)
                );
                if (!(yield checker.isValid(newAccessTokenPayload, userContext))) {
                    missingClaimId = "claim" in checker ? checker.claim.id : checker.claimId;
                    break;
                }
            }
            if (JSON.stringify(newAccessTokenPayload) !== origSessionClaimPayloadJSON) {
                yield this.regenerateToken(newAccessTokenPayload, userContext);
            }
            return missingClaimId;
        });
    }
    addClaim(claim, value, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const newAccessTokenPayload = claim.addToPayload(this.getAccessTokenPayload(), value, userContext);
            yield this.regenerateToken(newAccessTokenPayload, userContext);
        });
    }
    removeClaim(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const newAccessTokenPayload = claim.removeFromPayload(this.getAccessTokenPayload(), userContext);
            yield this.regenerateToken(newAccessTokenPayload, userContext);
        });
    }
    regenerateToken(newAccessTokenPayload, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let response = yield this.helpers.sessionRecipeImpl.regenerateAccessToken({
                    accessToken: this.getAccessToken(),
                    newAccessTokenPayload,
                    userContext: userContext === undefined ? {} : userContext,
                });
                // We update both, because the ones in the response are the latest for both
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
            } catch (err) {
                if (err.type === error_1.default.UNAUTHORISED) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.helpers.config, this.res);
                }
                throw err;
            }
        });
    }
}
exports.default = Session;
