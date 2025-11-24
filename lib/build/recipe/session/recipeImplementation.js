"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
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
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== "default") __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const SessionFunctions = __importStar(require("./sessionFunctions"));
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const utils_1 = require("./utils");
const sessionClass_1 = __importDefault(require("./sessionClass"));
const logger_1 = require("../../logger");
const jwt_1 = require("./jwt");
const accessToken_1 = require("./accessToken");
const error_1 = __importDefault(require("./error"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_1 = require("../multitenancy/constants");
const constants_2 = require("./constants");
const utils_2 = require("../../utils");
function getRecipeInterface(querier, config, appInfo, getRecipeImplAfterOverrides) {
    let obj = {
        createNewSession: async function ({
            recipeUserId,
            accessTokenPayload = {},
            sessionDataInDatabase = {},
            disableAntiCsrf,
            tenantId,
            userContext,
        }) {
            (0, logger_1.logDebugMessage)("createNewSession: Started");
            let response = await SessionFunctions.createNewSession(
                helpers,
                tenantId,
                recipeUserId,
                disableAntiCsrf === true,
                accessTokenPayload,
                sessionDataInDatabase,
                userContext
            );
            (0, logger_1.logDebugMessage)("createNewSession: Finished");
            const payload = (0, jwt_1.parseJWTWithoutSignatureVerification)(response.accessToken.token).payload;
            return new sessionClass_1.default(
                helpers,
                response.accessToken.token,
                (0, cookieAndHeaders_1.buildFrontToken)(response.session.userId, response.accessToken.expiry, payload),
                response.refreshToken,
                response.antiCsrfToken,
                response.session.handle,
                response.session.userId,
                response.session.recipeUserId,
                payload,
                undefined,
                true,
                tenantId
            );
        },
        getGlobalClaimValidators: async function (input) {
            return input.claimValidatorsAddedByOtherRecipes;
        },
        getSession: async function ({ accessToken: accessTokenString, antiCsrfToken, options, userContext }) {
            if (
                (options === null || options === void 0 ? void 0 : options.antiCsrfCheck) !== false &&
                typeof config.antiCsrfFunctionOrString === "string" &&
                config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER"
            ) {
                throw new Error(
                    "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                );
            }
            (0, logger_1.logDebugMessage)("getSession: Started");
            if (accessTokenString === undefined) {
                if ((options === null || options === void 0 ? void 0 : options.sessionRequired) === false) {
                    (0, logger_1.logDebugMessage)(
                        "getSession: returning undefined because accessToken is undefined and sessionRequired is false"
                    );
                    // there is no session that exists here, and the user wants session verification
                    // to be optional. So we return undefined.
                    return undefined;
                }
                (0, logger_1.logDebugMessage)("getSession: UNAUTHORISED because accessToken in request is undefined");
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
                accessToken = (0, jwt_1.parseJWTWithoutSignatureVerification)(accessTokenString);
                (0, accessToken_1.validateAccessTokenStructure)(accessToken.payload, accessToken.version);
            } catch (error) {
                if ((options === null || options === void 0 ? void 0 : options.sessionRequired) === false) {
                    (0, logger_1.logDebugMessage)(
                        "getSession: Returning undefined because parsing failed and sessionRequired is false"
                    );
                    return undefined;
                }
                (0, logger_1.logDebugMessage)(
                    "getSession: UNAUTHORISED because the accessToken couldn't be parsed or had an invalid structure"
                );
                throw new error_1.default({
                    message: "Token parsing failed",
                    type: "UNAUTHORISED",
                    payload: { clearTokens: false },
                });
            }
            const response = await SessionFunctions.getSession(
                helpers,
                accessToken,
                antiCsrfToken,
                (options === null || options === void 0 ? void 0 : options.antiCsrfCheck) !== false,
                (options === null || options === void 0 ? void 0 : options.checkDatabase) === true,
                config,
                userContext
            );
            (0, logger_1.logDebugMessage)("getSession: Success!");
            const payload =
                accessToken.version >= 3
                    ? response.accessToken !== undefined
                        ? (0, jwt_1.parseJWTWithoutSignatureVerification)(response.accessToken.token).payload
                        : accessToken.payload
                    : response.session.userDataInJWT;
            const session = new sessionClass_1.default(
                helpers,
                response.accessToken !== undefined ? response.accessToken.token : accessTokenString,
                (0, cookieAndHeaders_1.buildFrontToken)(
                    response.session.userId,
                    response.accessToken !== undefined ? response.accessToken.expiry : response.session.expiryTime,
                    payload
                ),
                undefined, // refresh
                antiCsrfToken,
                response.session.handle,
                response.session.userId,
                response.session.recipeUserId,
                payload,
                undefined,
                response.accessToken !== undefined,
                response.session.tenantId
            );
            return session;
        },
        validateClaims: async function (input) {
            let accessTokenPayload = input.accessTokenPayload;
            let accessTokenPayloadUpdate = undefined;
            const origSessionClaimPayloadJSON = JSON.stringify(accessTokenPayload);
            for (const validator of input.claimValidators) {
                (0, logger_1.logDebugMessage)(
                    "updateClaimsInPayloadIfNeeded checking shouldRefetch for " + validator.id
                );
                if ("claim" in validator && (await validator.shouldRefetch(accessTokenPayload, input.userContext))) {
                    (0, logger_1.logDebugMessage)("updateClaimsInPayloadIfNeeded refetching " + validator.id);
                    const value = await validator.claim.fetchValue(
                        input.userId,
                        input.recipeUserId,
                        accessTokenPayload.tId === undefined ? constants_1.DEFAULT_TENANT_ID : accessTokenPayload.tId,
                        accessTokenPayload,
                        input.userContext
                    );
                    (0, logger_1.logDebugMessage)(
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
            const invalidClaims = await (0, utils_1.validateClaimsInPayload)(
                input.claimValidators,
                accessTokenPayload,
                input.userContext
            );
            return {
                invalidClaims,
                accessTokenPayloadUpdate,
            };
        },
        getSessionInformation: async function ({ sessionHandle, userContext }) {
            return SessionFunctions.getSessionInformation(helpers, sessionHandle, userContext);
        },
        refreshSession: async function ({ refreshToken, antiCsrfToken, disableAntiCsrf, userContext }) {
            if (
                disableAntiCsrf !== true &&
                typeof config.antiCsrfFunctionOrString === "string" &&
                config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER"
            ) {
                throw new Error(
                    "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                );
            }
            (0, logger_1.logDebugMessage)("refreshSession: Started");
            const response = await SessionFunctions.refreshSession(
                helpers,
                refreshToken,
                antiCsrfToken,
                disableAntiCsrf,
                config.useDynamicAccessTokenSigningKey,
                userContext
            );
            (0, logger_1.logDebugMessage)("refreshSession: Success!");
            const payload = (0, jwt_1.parseJWTWithoutSignatureVerification)(response.accessToken.token).payload;
            return new sessionClass_1.default(
                helpers,
                response.accessToken.token,
                (0, cookieAndHeaders_1.buildFrontToken)(response.session.userId, response.accessToken.expiry, payload),
                response.refreshToken,
                response.antiCsrfToken,
                response.session.handle,
                response.session.userId,
                response.session.recipeUserId,
                payload,
                undefined,
                true,
                payload.tId
            );
        },
        regenerateAccessToken: async function (input) {
            let newAccessTokenPayload =
                input.newAccessTokenPayload === null || input.newAccessTokenPayload === undefined
                    ? {}
                    : input.newAccessTokenPayload;
            let response = await querier.sendPostRequest(
                "/recipe/session/regenerate",
                {
                    accessToken: input.accessToken,
                    userDataInJWT: newAccessTokenPayload,
                },
                input.userContext
            );
            if (response.status === "UNAUTHORISED") {
                return undefined;
            }
            return {
                status: response.status,
                session: {
                    handle: response.session.handle,
                    userId: response.session.userId,
                    recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                    userDataInJWT: response.session.userDataInJWT,
                    tenantId: response.session.tenantId,
                },
                accessToken: response.accessToken,
            };
        },
        revokeAllSessionsForUser: function ({
            userId,
            tenantId,
            revokeAcrossAllTenants,
            revokeSessionsForLinkedAccounts,
            userContext,
        }) {
            return SessionFunctions.revokeAllSessionsForUser(
                helpers,
                userId,
                revokeSessionsForLinkedAccounts,
                tenantId,
                revokeAcrossAllTenants,
                userContext
            );
        },
        getAllSessionHandlesForUser: function ({
            userId,
            fetchSessionsForAllLinkedAccounts,
            tenantId,
            fetchAcrossAllTenants,
            userContext,
        }) {
            return SessionFunctions.getAllSessionHandlesForUser(
                helpers,
                userId,
                fetchSessionsForAllLinkedAccounts,
                tenantId,
                fetchAcrossAllTenants,
                userContext
            );
        },
        revokeSession: function ({ sessionHandle, userContext }) {
            return SessionFunctions.revokeSession(helpers, sessionHandle, userContext);
        },
        revokeMultipleSessions: function ({ sessionHandles, userContext }) {
            return SessionFunctions.revokeMultipleSessions(helpers, sessionHandles, userContext);
        },
        updateSessionDataInDatabase: function ({ sessionHandle, newSessionData, userContext }) {
            return SessionFunctions.updateSessionDataInDatabase(helpers, sessionHandle, newSessionData, userContext);
        },
        mergeIntoAccessTokenPayload: async function ({ sessionHandle, accessTokenPayloadUpdate, userContext }) {
            const sessionInfo = await this.getSessionInformation({ sessionHandle, userContext });
            if (sessionInfo === undefined) {
                return false;
            }
            let newAccessTokenPayload = Object.assign({}, sessionInfo.customClaimsInAccessTokenPayload);
            for (const key of constants_2.protectedProps) {
                delete newAccessTokenPayload[key];
            }
            newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), accessTokenPayloadUpdate);
            for (const key of Object.keys(accessTokenPayloadUpdate)) {
                if (accessTokenPayloadUpdate[key] === null) {
                    delete newAccessTokenPayload[key];
                }
            }
            return SessionFunctions.updateAccessTokenPayload(
                helpers,
                sessionHandle,
                newAccessTokenPayload,
                userContext
            );
        },
        fetchAndSetClaim: async function (input) {
            const sessionInfo = await this.getSessionInformation({
                sessionHandle: input.sessionHandle,
                userContext: input.userContext,
            });
            if (sessionInfo === undefined) {
                return false;
            }
            const accessTokenPayloadUpdate = await input.claim.build(
                sessionInfo.userId,
                sessionInfo.recipeUserId,
                sessionInfo.tenantId,
                sessionInfo.customClaimsInAccessTokenPayload,
                input.userContext
            );
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
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
        getClaimValue: async function (input) {
            const sessionInfo = await this.getSessionInformation({
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
                value: input.claim.getValueFromPayload(sessionInfo.customClaimsInAccessTokenPayload, input.userContext),
            };
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
        config,
        appInfo,
        getRecipeImpl: getRecipeImplAfterOverrides,
    };
    if ((0, utils_2.isTestEnv)()) {
        // testing mode, we add some of the help functions to the obj
        obj.helpers = helpers;
    }
    return obj;
}
