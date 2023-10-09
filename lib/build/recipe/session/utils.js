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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateClaimsInPayload = exports.getRequiredClaimValidators = exports.setAccessTokenInResponse = exports.normaliseSameSiteOrThrowError = exports.validateAndNormaliseUserInput = exports.getURLProtocol = exports.normaliseSessionScopeOrThrowError = exports.sendTokenTheftDetectedResponse = exports.sendInvalidClaimResponse = exports.sendUnauthorisedResponse = exports.sendTryRefreshTokenResponse = void 0;
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const recipe_1 = __importDefault(require("./recipe"));
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const utils_1 = require("../../utils");
const utils_2 = require("../../utils");
const logger_1 = require("../../logger");
async function sendTryRefreshTokenResponse(recipeInstance, _, __, response) {
    utils_2.sendNon200ResponseWithMessage(
        response,
        "try refresh token",
        recipeInstance.config.sessionExpiredStatusCode
    );
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
async function sendUnauthorisedResponse(recipeInstance, _, __, response) {
    utils_2.sendNon200ResponseWithMessage(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
async function sendInvalidClaimResponse(recipeInstance, claimValidationErrors, __, response) {
    utils_2.sendNon200Response(response, recipeInstance.config.invalidClaimStatusCode, {
        message: "invalid claim",
        claimValidationErrors,
    });
}
exports.sendInvalidClaimResponse = sendInvalidClaimResponse;
async function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, _, __, ___, response) {
    await recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle, userContext: {} });
    utils_2.sendNon200ResponseWithMessage(
        response,
        "token theft detected",
        recipeInstance.config.sessionExpiredStatusCode
    );
}
exports.sendTokenTheftDetectedResponse = sendTokenTheftDetectedResponse;
function normaliseSessionScopeOrThrowError(sessionScope) {
    function helper(sessionScope) {
        sessionScope = sessionScope.trim().toLowerCase();
        // first we convert it to a URL so that we can use the URL class
        if (sessionScope.startsWith(".")) {
            sessionScope = sessionScope.substr(1);
        }
        if (!sessionScope.startsWith("http://") && !sessionScope.startsWith("https://")) {
            sessionScope = "http://" + sessionScope;
        }
        try {
            let urlObj = new URL(sessionScope);
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
    let urlObj = new URL(url);
    return urlObj.protocol;
}
exports.getURLProtocol = getURLProtocol;
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    var _a, _b, _c;
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(config.cookieDomain);
    let accessTokenPath =
        config === undefined || config.accessTokenPath === undefined
            ? new normalisedURLPath_1.default("/")
            : new normalisedURLPath_1.default(config.accessTokenPath);
    let protocolOfAPIDomain = getURLProtocol(appInfo.apiDomain.getAsStringDangerous());
    let cookieSameSite = (input) => {
        let protocolOfWebsiteDomain = getURLProtocol(
            appInfo
                .getOrigin({
                    request: input.request,
                    userContext: input.userContext,
                })
                .getAsStringDangerous()
        );
        return appInfo.topLevelAPIDomain !== appInfo.getTopLevelWebsiteDomain(input) ||
            protocolOfAPIDomain !== protocolOfWebsiteDomain
            ? "none"
            : "lax";
    };
    if (config !== undefined && config.cookieSameSite !== undefined) {
        let normalisedCookieSameSite = normaliseSameSiteOrThrowError(config.cookieSameSite);
        cookieSameSite = () => normalisedCookieSameSite;
    }
    let cookieSecure =
        config === undefined || config.cookieSecure === undefined
            ? appInfo.apiDomain.getAsStringDangerous().startsWith("https")
            : config.cookieSecure;
    let sessionExpiredStatusCode =
        config === undefined || config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    const invalidClaimStatusCode =
        (_a = config === null || config === void 0 ? void 0 : config.invalidClaimStatusCode) !== null && _a !== void 0
            ? _a
            : 403;
    if (sessionExpiredStatusCode === invalidClaimStatusCode) {
        throw new Error("sessionExpiredStatusCode and sessionExpiredStatusCode must be different");
    }
    if (config !== undefined && config.antiCsrf !== undefined) {
        if (config.antiCsrf !== "NONE" && config.antiCsrf !== "VIA_CUSTOM_HEADER" && config.antiCsrf !== "VIA_TOKEN") {
            throw new Error("antiCsrf config must be one of 'NONE' or 'VIA_CUSTOM_HEADER' or 'VIA_TOKEN'");
        }
    }
    let antiCsrf = ({ request, userContext }) => {
        const sameSite = cookieSameSite({
            request,
            userContext,
        });
        if (sameSite === "none") {
            return "VIA_CUSTOM_HEADER";
        }
        return "NONE";
    };
    if (config !== undefined && config.antiCsrf !== undefined) {
        antiCsrf = config.antiCsrf;
    }
    let errorHandlers = {
        onTokenTheftDetected: async (sessionHandle, userId, recipeUserId, request, response) => {
            return await sendTokenTheftDetectedResponse(
                recipeInstance,
                sessionHandle,
                userId,
                recipeUserId,
                request,
                response
            );
        },
        onTryRefreshToken: async (message, request, response) => {
            return await sendTryRefreshTokenResponse(recipeInstance, message, request, response);
        },
        onUnauthorised: async (message, request, response) => {
            return await sendUnauthorisedResponse(recipeInstance, message, request, response);
        },
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
        getCookieSameSite: cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        errorHandlers,
        antiCsrfFunctionOrString: antiCsrf,
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
function setAccessTokenInResponse(res, accessToken, frontToken, config, transferMethod, req, userContext) {
    cookieAndHeaders_1.setFrontTokenInHeaders(res, frontToken);
    cookieAndHeaders_1.setToken(
        config,
        res,
        "access",
        accessToken,
        // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
        // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
        // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
        // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
        Date.now() + constants_1.hundredYearsInMs,
        transferMethod,
        req,
        userContext
    );
    if (config.exposeAccessTokenToFrontendInCookieBasedAuth && transferMethod === "cookie") {
        cookieAndHeaders_1.setToken(
            config,
            res,
            "access",
            accessToken,
            // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
            // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
            // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
            // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
            Date.now() + constants_1.hundredYearsInMs,
            "header",
            req,
            userContext
        );
    }
}
exports.setAccessTokenInResponse = setAccessTokenInResponse;
async function getRequiredClaimValidators(session, overrideGlobalClaimValidators, userContext) {
    const claimValidatorsAddedByOtherRecipes = recipe_1.default
        .getInstanceOrThrowError()
        .getClaimValidatorsAddedByOtherRecipes();
    const globalClaimValidators = await recipe_1.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getGlobalClaimValidators({
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId(),
            tenantId: session.getTenantId(),
            claimValidatorsAddedByOtherRecipes,
            userContext,
        });
    return overrideGlobalClaimValidators !== undefined
        ? await overrideGlobalClaimValidators(globalClaimValidators, session, userContext)
        : globalClaimValidators;
}
exports.getRequiredClaimValidators = getRequiredClaimValidators;
async function validateClaimsInPayload(claimValidators, newAccessTokenPayload, userContext) {
    const validationErrors = [];
    for (const validator of claimValidators) {
        const claimValidationResult = await validator.validate(newAccessTokenPayload, userContext);
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
}
exports.validateClaimsInPayload = validateClaimsInPayload;
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
