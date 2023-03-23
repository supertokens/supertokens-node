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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = __importDefault(require("./error"));
const recipeImplementation_1 = require("./recipeImplementation");
const utils_1 = require("./utils");
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
    }
    revokeSession(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
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
            cookieAndHeaders_1.clearSession(this.helpers.config, this.res, this.transferMethod);
        });
    }
    getSessionDataFromDatabase(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                sessionHandle: this.sessionHandle,
                userContext: userContext === undefined ? {} : userContext,
            });
            if (sessionInfo === undefined) {
                throw new error_1.default({
                    message: "Session does not exist anymore",
                    type: error_1.default.UNAUTHORISED,
                });
            }
            return sessionInfo.sessionDataInDatabase;
        });
    }
    updateSessionDataInDatabase(newSessionData, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (
                !(yield this.helpers.getRecipeImpl().updateSessionDataInDatabase({
                    sessionHandle: this.sessionHandle,
                    newSessionData,
                    userContext: userContext === undefined ? {} : userContext,
                }))
            ) {
                throw new error_1.default({
                    message: "Session does not exist anymore",
                    type: error_1.default.UNAUTHORISED,
                });
            }
        });
    }
    getUserId(_userContext) {
        return this.userId;
    }
    getAccessTokenPayload(_userContext) {
        return this.userDataInAccessToken;
    }
    getHandle() {
        return this.sessionHandle;
    }
    getAccessToken() {
        return this.accessToken;
    }
    // Any update to this function should also be reflected in the respective JWT version
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let newAccessTokenPayload = Object.assign({}, this.getAccessTokenPayload(userContext));
            for (const key of recipeImplementation_1.protectedProps) {
                delete newAccessTokenPayload[key];
            }
            newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), accessTokenPayloadUpdate);
            for (const key of Object.keys(accessTokenPayloadUpdate)) {
                if (accessTokenPayloadUpdate[key] === null) {
                    delete newAccessTokenPayload[key];
                }
            }
            let response = yield this.helpers.getRecipeImpl().regenerateAccessToken({
                accessToken: this.getAccessToken(),
                newAccessTokenPayload,
                userContext: userContext === undefined ? {} : userContext,
            });
            if (response === undefined) {
                throw new error_1.default({
                    message: "Session does not exist anymore",
                    type: error_1.default.UNAUTHORISED,
                });
            }
            this.userDataInAccessToken = response.session.userDataInJWT;
            if (response.accessToken !== undefined) {
                this.accessToken = response.accessToken.token;
                // We need to cast to let TS know that the accessToken in the response is defined (and we don't overwrite it with undefined)
                utils_1.setAccessTokenInResponse(this.res, response, this.helpers.config, this.transferMethod);
            }
        });
    }
    getTimeCreated(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                sessionHandle: this.sessionHandle,
                userContext: userContext === undefined ? {} : userContext,
            });
            if (sessionInfo === undefined) {
                throw new error_1.default({
                    message: "Session does not exist anymore",
                    type: error_1.default.UNAUTHORISED,
                });
            }
            return sessionInfo.timeCreated;
        });
    }
    getExpiry(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionInfo = yield this.helpers.getRecipeImpl().getSessionInformation({
                sessionHandle: this.sessionHandle,
                userContext: userContext === undefined ? {} : userContext,
            });
            if (sessionInfo === undefined) {
                throw new error_1.default({
                    message: "Session does not exist anymore",
                    type: error_1.default.UNAUTHORISED,
                });
            }
            return sessionInfo.expiry;
        });
    }
    // Any update to this function should also be reflected in the respective JWT version
    assertClaims(claimValidators, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let validateClaimResponse = yield this.helpers.getRecipeImpl().validateClaims({
                accessTokenPayload: this.getAccessTokenPayload(userContext),
                userId: this.getUserId(userContext),
                claimValidators,
                userContext,
            });
            if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
                for (const key of recipeImplementation_1.protectedProps) {
                    delete validateClaimResponse.accessTokenPayloadUpdate[key];
                }
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
    }
    // Any update to this function should also be reflected in the respective JWT version
    fetchAndSetClaim(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = yield claim.build(this.getUserId(userContext), userContext);
            return this.mergeIntoAccessTokenPayload(update, userContext);
        });
    }
    // Any update to this function should also be reflected in the respective JWT version
    setClaimValue(claim, value, userContext) {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
    // Any update to this function should also be reflected in the respective JWT version
    getClaimValue(claim, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return claim.getValueFromPayload(yield this.getAccessTokenPayload(userContext), userContext);
        });
    }
    // Any update to this function should also be reflected in the respective JWT version
    removeClaim(claim, userContext) {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }
}
exports.default = Session;
