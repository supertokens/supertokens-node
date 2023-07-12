"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
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
exports.protectedProps = exports.JWKCacheMaxAgeInMs = void 0;
const jose_1 = require("jose");
const SessionFunctions = __importStar(require("./sessionFunctions"));
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const utils_1 = require("./utils");
const sessionClass_1 = __importDefault(require("./sessionClass"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const logger_1 = require("../../logger");
const jwt_1 = require("./jwt");
const accessToken_1 = require("./accessToken");
const error_1 = __importDefault(require("./error"));
const constants_1 = require("../multitenancy/constants");
const JWKCacheCooldownInMs = 500;
exports.JWKCacheMaxAgeInMs = 60000;
exports.protectedProps = [
    "sub",
    "iat",
    "exp",
    "sessionHandle",
    "parentRefreshTokenHash1",
    "refreshTokenHash1",
    "antiCsrfToken",
    "tId",
];
function getRecipeInterface(querier, config, appInfo, getRecipeImplAfterOverrides) {
    const JWKS = querier.getAllCoreUrlsForPath("/.well-known/jwks.json").map((url) =>
        jose_1.createRemoteJWKSet(new URL(url), {
            cooldownDuration: JWKCacheCooldownInMs,
            cacheMaxAge: exports.JWKCacheMaxAgeInMs,
        })
    );
    /**
        This function fetches all JWKs from the first available core instance. This combines the other JWKS functions to become
        error resistant.

        Every core instance a backend is connected to is expected to connect to the same database and use the same key set for
        token verification. Otherwise, the result of session verification would depend on which core is currently available.
    */
    const combinedJWKS = (...args) =>
        __awaiter(this, void 0, void 0, function* () {
            let lastError = undefined;
            if (JWKS.length === 0) {
                throw Error(
                    "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
                );
            }
            for (const jwks of JWKS) {
                try {
                    // We await before returning to make sure we catch the error
                    return yield jwks(...args);
                } catch (ex) {
                    lastError = ex;
                }
            }
            throw lastError;
        });
    let obj = {
        createNewSession: function ({
            userId,
            accessTokenPayload = {},
            sessionDataInDatabase = {},
            disableAntiCsrf,
            tenantId,
        }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger_1.logDebugMessage("createNewSession: Started");
                let response = yield SessionFunctions.createNewSession(
                    helpers,
                    tenantId,
                    userId,
                    disableAntiCsrf === true,
                    accessTokenPayload,
                    sessionDataInDatabase
                );
                logger_1.logDebugMessage("createNewSession: Finished");
                const payload = jwt_1.parseJWTWithoutSignatureVerification(response.accessToken.token).payload;
                return new sessionClass_1.default(
                    helpers,
                    response.accessToken.token,
                    cookieAndHeaders_1.buildFrontToken(response.session.userId, response.accessToken.expiry, payload),
                    response.refreshToken,
                    response.antiCsrfToken,
                    response.session.handle,
                    response.session.userId,
                    payload,
                    undefined,
                    true,
                    tenantId
                );
            });
        },
        getGlobalClaimValidators: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return input.claimValidatorsAddedByOtherRecipes;
            });
        },
        getSession: function ({ accessToken: accessTokenString, antiCsrfToken, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (
                    (options === null || options === void 0 ? void 0 : options.antiCsrfCheck) !== false &&
                    config.antiCsrf === "VIA_CUSTOM_HEADER"
                ) {
                    throw new Error(
                        "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                    );
                }
                logger_1.logDebugMessage("getSession: Started");
                if (accessTokenString === undefined) {
                    if ((options === null || options === void 0 ? void 0 : options.sessionRequired) === false) {
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
                let accessToken;
                try {
                    accessToken = jwt_1.parseJWTWithoutSignatureVerification(accessTokenString);
                    accessToken_1.validateAccessTokenStructure(accessToken.payload, accessToken.version);
                } catch (error) {
                    if ((options === null || options === void 0 ? void 0 : options.sessionRequired) === false) {
                        logger_1.logDebugMessage(
                            "getSession: Returning undefined because parsing failed and sessionRequired is false"
                        );
                        return undefined;
                    }
                    logger_1.logDebugMessage(
                        "getSession: UNAUTHORISED because the accessToken couldn't be parsed or had an invalid structure"
                    );
                    throw new error_1.default({
                        message: "Token parsing failed",
                        type: "UNAUTHORISED",
                        payload: { clearTokens: false },
                    });
                }
                const response = yield SessionFunctions.getSession(
                    helpers,
                    accessToken,
                    antiCsrfToken,
                    (options === null || options === void 0 ? void 0 : options.antiCsrfCheck) !== false,
                    (options === null || options === void 0 ? void 0 : options.checkDatabase) === true
                );
                logger_1.logDebugMessage("getSession: Success!");
                const payload =
                    accessToken.version >= 3
                        ? response.accessToken !== undefined
                            ? jwt_1.parseJWTWithoutSignatureVerification(response.accessToken.token).payload
                            : accessToken.payload
                        : response.session.userDataInJWT;
                const session = new sessionClass_1.default(
                    helpers,
                    response.accessToken !== undefined ? response.accessToken.token : accessTokenString,
                    cookieAndHeaders_1.buildFrontToken(
                        response.session.userId,
                        response.accessToken !== undefined ? response.accessToken.expiry : response.session.expiryTime,
                        payload
                    ),
                    undefined, // refresh
                    antiCsrfToken,
                    response.session.handle,
                    response.session.userId,
                    payload,
                    undefined,
                    response.accessToken !== undefined,
                    response.session.tenantId
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
                        const value = yield validator.claim.fetchValue(
                            input.userId,
                            accessTokenPayload.tId === undefined
                                ? constants_1.DEFAULT_TENANT_ID
                                : accessTokenPayload.tId,
                            input.userContext
                        );
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
        refreshSession: function ({ refreshToken, antiCsrfToken, disableAntiCsrf }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (disableAntiCsrf !== true && config.antiCsrf === "VIA_CUSTOM_HEADER") {
                    throw new Error(
                        "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                    );
                }
                logger_1.logDebugMessage("refreshSession: Started");
                const response = yield SessionFunctions.refreshSession(
                    helpers,
                    refreshToken,
                    antiCsrfToken,
                    disableAntiCsrf
                );
                logger_1.logDebugMessage("refreshSession: Success!");
                const payload = jwt_1.parseJWTWithoutSignatureVerification(response.accessToken.token).payload;
                return new sessionClass_1.default(
                    helpers,
                    response.accessToken.token,
                    cookieAndHeaders_1.buildFrontToken(response.session.userId, response.accessToken.expiry, payload),
                    response.refreshToken,
                    response.antiCsrfToken,
                    response.session.handle,
                    response.session.userId,
                    payload,
                    undefined,
                    true,
                    payload.tId
                );
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
                return {
                    status: response.status,
                    session: {
                        handle: response.session.handle,
                        userId: response.session.userId,
                        userDataInJWT: response.session.userDataInJWT,
                        tenantId: response.session.tenantId,
                    },
                    accessToken: response.accessToken,
                };
            });
        },
        revokeAllSessionsForUser: function ({ userId, tenantId, revokeAcrossAllTenants }) {
            return SessionFunctions.revokeAllSessionsForUser(helpers, userId, tenantId, revokeAcrossAllTenants);
        },
        getAllSessionHandlesForUser: function ({ userId, tenantId, fetchAcrossAllTenants }) {
            return SessionFunctions.getAllSessionHandlesForUser(helpers, userId, tenantId, fetchAcrossAllTenants);
        },
        revokeSession: function ({ sessionHandle }) {
            return SessionFunctions.revokeSession(helpers, sessionHandle);
        },
        revokeMultipleSessions: function ({ sessionHandles }) {
            return SessionFunctions.revokeMultipleSessions(helpers, sessionHandles);
        },
        updateSessionDataInDatabase: function ({ sessionHandle, newSessionData }) {
            return SessionFunctions.updateSessionDataInDatabase(helpers, sessionHandle, newSessionData);
        },
        mergeIntoAccessTokenPayload: function ({ sessionHandle, accessTokenPayloadUpdate, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const sessionInfo = yield this.getSessionInformation({ sessionHandle, userContext });
                if (sessionInfo === undefined) {
                    return false;
                }
                let newAccessTokenPayload = Object.assign({}, sessionInfo.customClaimsInAccessTokenPayload);
                for (const key of exports.protectedProps) {
                    delete newAccessTokenPayload[key];
                }
                newAccessTokenPayload = Object.assign(
                    Object.assign({}, newAccessTokenPayload),
                    accessTokenPayloadUpdate
                );
                for (const key of Object.keys(accessTokenPayloadUpdate)) {
                    if (accessTokenPayloadUpdate[key] === null) {
                        delete newAccessTokenPayload[key];
                    }
                }
                return SessionFunctions.updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload);
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
                const accessTokenPayloadUpdate = yield input.claim.build(
                    sessionInfo.userId,
                    sessionInfo.tenantId,
                    input.userContext
                );
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
                    value: input.claim.getValueFromPayload(
                        sessionInfo.customClaimsInAccessTokenPayload,
                        input.userContext
                    ),
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
        JWKS: combinedJWKS,
        config,
        appInfo,
        getRecipeImpl: getRecipeImplAfterOverrides,
    };
    if (process.env.TEST_MODE === "testing") {
        // testing mode, we add some of the help functions to the obj
        obj.helpers = helpers;
    }
    return obj;
}
exports.default = getRecipeInterface;
