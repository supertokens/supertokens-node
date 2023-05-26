"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
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
exports.checkAntiCsrfOrThrowError = exports.validateClaimsInPayload = exports.getRequiredClaimValidators = exports.setAccessTokenInResponse = exports.normaliseSameSiteOrThrowError = exports.validateAndNormaliseUserInput = exports.getURLProtocol = exports.normaliseSessionScopeOrThrowError = exports.sendTokenTheftDetectedResponse = exports.sendInvalidClaimResponse = exports.sendUnauthorisedResponse = exports.sendTryRefreshTokenResponse = void 0;
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const url_1 = require("url");
const recipe_1 = __importDefault(require("./recipe"));
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const utils_1 = require("../../utils");
const utils_2 = require("../../utils");
const logger_1 = require("../../logger");
const recipe_2 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("../../error"));
function sendTryRefreshTokenResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_2.sendNon200ResponseWithMessage(
            response,
            "try refresh token",
            recipeInstance.config.sessionExpiredStatusCode
        );
    });
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
function sendUnauthorisedResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_2.sendNon200ResponseWithMessage(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
function sendInvalidClaimResponse(recipeInstance, claimValidationErrors, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_2.sendNon200Response(response, recipeInstance.config.invalidClaimStatusCode, {
            message: "invalid claim",
            claimValidationErrors,
        });
    });
}
exports.sendInvalidClaimResponse = sendInvalidClaimResponse;
function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        yield recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle, userContext: {} });
        utils_2.sendNon200ResponseWithMessage(
            response,
            "token theft detected",
            recipeInstance.config.sessionExpiredStatusCode
        );
    });
}
exports.sendTokenTheftDetectedResponse = sendTokenTheftDetectedResponse;
function normaliseSessionScopeOrThrowError(sessionScope) {
    function helper(sessionScope) {
        sessionScope = sessionScope.trim().toLowerCase();
        // first we convert it to a URL so that we can use the URL class
        if (sessionScope.startsWith(".")) {
            sessionScope = sessionScope.substr(1);
        }
        // The following check is to check if the input string includes a protocol
        if (!sessionScope.includes("://")) {
            sessionScope = "http://" + sessionScope;
        }
        try {
            let urlObj = new url_1.URL(sessionScope);
            sessionScope = urlObj.hostname;
            // remove leading dot
            if (sessionScope.startsWith(".")) {
                sessionScope = sessionScope.substr(1);
            }
            return sessionScope;
        } catch (err) {
            throw new Error("Please provide a valid sessionScope");
        }
    }
    let noDotNormalised = helper(sessionScope);
    if (noDotNormalised === "localhost" || utils_1.isAnIpAddress(noDotNormalised)) {
        return noDotNormalised;
    }
    if (sessionScope.startsWith(".")) {
        return "." + noDotNormalised;
    }
    return noDotNormalised;
}
exports.normaliseSessionScopeOrThrowError = normaliseSessionScopeOrThrowError;
function getURLProtocol(url) {
    let urlObj = new url_1.URL(url);
    return urlObj.protocol;
}
exports.getURLProtocol = getURLProtocol;
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    var _a, _b, _c;
    let cookieDomain = (req, userContext) =>
        __awaiter(this, void 0, void 0, function* () {
            if (config !== undefined && config.cookieDomain !== undefined) {
                if (typeof config.cookieDomain === "string") {
                    return normaliseSessionScopeOrThrowError(config.cookieDomain);
                } else {
                    const domain = yield config.cookieDomain(req, userContext);
                    return normaliseSessionScopeOrThrowError(domain);
                }
            }
            return undefined;
        });
    let accessTokenPath =
        config === undefined || config.accessTokenPath === undefined
            ? new normalisedURLPath_1.default("/")
            : new normalisedURLPath_1.default(config.accessTokenPath);
    const cookieSameSite = (req, userContext) =>
        __awaiter(this, void 0, void 0, function* () {
            const origin = yield appInfo.origin(req, userContext);
            const originString = origin.getAsStringDangerous();
            let protocolOfAPIDomain = getURLProtocol(appInfo.apiDomain.getAsStringDangerous());
            let protocolOfWebsiteDomain = getURLProtocol(originString);
            let topLevelWebsiteDomain = utils_1.getTopLevelDomainForSameSiteResolution(originString);
            let cookieSameSiteNormalise = "none";
            if (config !== undefined && config.cookieSameSite !== undefined) {
                if (typeof config.cookieSameSite === "string") {
                    cookieSameSiteNormalise = normaliseSameSiteOrThrowError(config.cookieSameSite);
                } else {
                    let cookieSameSiteFunc = yield config.cookieSameSite(req, userContext);
                    cookieSameSiteNormalise = normaliseSameSiteOrThrowError(cookieSameSiteFunc);
                }
            }
            let cookieSameSite =
                appInfo.topLevelAPIDomain !== topLevelWebsiteDomain || protocolOfAPIDomain !== protocolOfWebsiteDomain
                    ? "none"
                    : "lax";
            cookieSameSite =
                config === undefined || config.cookieSameSite === undefined ? cookieSameSite : cookieSameSiteNormalise;
            return cookieSameSite;
        });
    let cookieSecure = (req, userContext) =>
        __awaiter(this, void 0, void 0, function* () {
            let cookieSecureVal = appInfo.apiDomain.getAsStringDangerous().startsWith("https");
            if (config !== undefined && config.cookieSecure !== undefined) {
                if (typeof config.cookieSecure === "boolean") {
                    cookieSecureVal = config.cookieSecure;
                } else {
                    cookieSecureVal = yield config.cookieSecure(req, userContext);
                }
            }
            return config === undefined || config.cookieSecure === undefined
                ? appInfo.apiDomain.getAsStringDangerous().startsWith("https")
                : cookieSecureVal;
        });
    let sessionExpiredStatusCode =
        config === undefined || config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    const invalidClaimStatusCode =
        (_a = config === null || config === void 0 ? void 0 : config.invalidClaimStatusCode) !== null && _a !== void 0
            ? _a
            : 403;
    if (sessionExpiredStatusCode === invalidClaimStatusCode) {
        throw new Error("sessionExpiredStatusCode and sessionExpiredStatusCode must be different");
    }
    let antiCsrf = (req, userContext) =>
        __awaiter(this, void 0, void 0, function* () {
            const cookieSameSiteRes = yield cookieSameSite(req, userContext);
            let antiCsrfVal = "NONE";
            if (config !== undefined && config.antiCsrf !== undefined) {
                if (typeof config.antiCsrf === "string") {
                    antiCsrfVal = config.antiCsrf;
                } else {
                    antiCsrfVal = yield config.antiCsrf(req, userContext);
                }
            }
            return config === undefined || config.antiCsrf === undefined
                ? cookieSameSiteRes === "none"
                    ? "VIA_CUSTOM_HEADER"
                    : "NONE"
                : antiCsrfVal;
        });
    let errorHandlers = {
        onTokenTheftDetected: (sessionHandle, userId, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, userId, request, response);
            }),
        onTryRefreshToken: (message, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield sendTryRefreshTokenResponse(recipeInstance, message, request, response);
            }),
        onUnauthorised: (message, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield sendUnauthorisedResponse(recipeInstance, message, request, response);
            }),
        onInvalidClaim: (validationErrors, request, response) => {
            return sendInvalidClaimResponse(recipeInstance, validationErrors, request, response);
        },
    };
    if (config !== undefined && config.errorHandlers !== undefined) {
        if (config.errorHandlers.onTokenTheftDetected !== undefined) {
            errorHandlers.onTokenTheftDetected = config.errorHandlers.onTokenTheftDetected;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
        if (config.errorHandlers.onInvalidClaim !== undefined) {
            errorHandlers.onInvalidClaim = config.errorHandlers.onInvalidClaim;
        }
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        useDynamicAccessTokenSigningKey:
            (_b = config === null || config === void 0 ? void 0 : config.useDynamicAccessTokenSigningKey) !== null &&
            _b !== void 0
                ? _b
                : true,
        exposeAccessTokenToFrontendInCookieBasedAuth:
            (_c =
                config === null || config === void 0 ? void 0 : config.exposeAccessTokenToFrontendInCookieBasedAuth) !==
                null && _c !== void 0
                ? _c
                : false,
        refreshTokenPath: appInfo.apiBasePath.appendPath(new normalisedURLPath_1.default(constants_1.REFRESH_API_PATH)),
        accessTokenPath,
        getTokenTransferMethod:
            (config === null || config === void 0 ? void 0 : config.getTokenTransferMethod) === undefined
                ? defaultGetTokenTransferMethod
                : config.getTokenTransferMethod,
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        errorHandlers,
        antiCsrf,
        override,
        invalidClaimStatusCode,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function normaliseSameSiteOrThrowError(sameSite) {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new Error(`cookie same site must be one of "strict", "lax", or "none"`);
    }
    return sameSite;
}
exports.normaliseSameSiteOrThrowError = normaliseSameSiteOrThrowError;
function setAccessTokenInResponse(req, res, accessToken, frontToken, config, transferMethod, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        cookieAndHeaders_1.setFrontTokenInHeaders(res, frontToken);
        yield cookieAndHeaders_1.setToken(
            config,
            req,
            res,
            "access",
            accessToken,
            // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
            // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
            // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
            // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
            Date.now() + constants_1.hundredYearsInMs,
            transferMethod,
            userContext
        );
        if (config.exposeAccessTokenToFrontendInCookieBasedAuth && transferMethod === "cookie") {
            yield cookieAndHeaders_1.setToken(
                config,
                req,
                res,
                "access",
                accessToken,
                // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
                // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
                Date.now() + constants_1.hundredYearsInMs,
                "header",
                userContext
            );
        }
    });
}
exports.setAccessTokenInResponse = setAccessTokenInResponse;
function getRequiredClaimValidators(session, overrideGlobalClaimValidators, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const claimValidatorsAddedByOtherRecipes = recipe_1.default
            .getInstanceOrThrowError()
            .getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators = yield recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getGlobalClaimValidators({
                userId: session.getUserId(),
                claimValidatorsAddedByOtherRecipes,
                userContext,
            });
        return overrideGlobalClaimValidators !== undefined
            ? yield overrideGlobalClaimValidators(globalClaimValidators, session, userContext)
            : globalClaimValidators;
    });
}
exports.getRequiredClaimValidators = getRequiredClaimValidators;
function validateClaimsInPayload(claimValidators, newAccessTokenPayload, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const validationErrors = [];
        for (const validator of claimValidators) {
            const claimValidationResult = yield validator.validate(newAccessTokenPayload, userContext);
            logger_1.logDebugMessage(
                "validateClaimsInPayload " + validator.id + " validation res " + JSON.stringify(claimValidationResult)
            );
            if (!claimValidationResult.isValid) {
                validationErrors.push({
                    id: validator.id,
                    reason: claimValidationResult.reason,
                });
            }
        }
        return validationErrors;
    });
}
exports.validateClaimsInPayload = validateClaimsInPayload;
function checkAntiCsrfOrThrowError(antiCSRF, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const recipeInstance = recipe_2.default.getInstanceOrThrowError();
        const appInfo = recipeInstance.getAppInfo();
        if (antiCSRF === undefined) {
            if (appInfo.initialOriginType === "string") {
                return yield recipeInstance.config.antiCsrf({}, userContext);
            } else {
                throw new error_1.default({
                    type: "INVALID_INPUT",
                    message:
                        "To use this function, either value of antiCSRF should be passed or typeof origin should be string",
                });
            }
        } else {
            return antiCSRF;
        }
    });
}
exports.checkAntiCsrfOrThrowError = checkAntiCsrfOrThrowError;
function defaultGetTokenTransferMethod({ req, forCreateNewSession }) {
    // We allow fallback (checking headers then cookies) by default when validating
    if (!forCreateNewSession) {
        return "any";
    }
    // In create new session we respect the frontend preference by default
    switch (cookieAndHeaders_1.getAuthModeFromHeader(req)) {
        case "header":
            return "header";
        case "cookie":
            return "cookie";
        default:
            return "any";
    }
}
