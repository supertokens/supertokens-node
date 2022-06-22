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
Object.defineProperty(exports, "__esModule", { value: true });
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const url_1 = require("url");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const psl = require("psl");
const utils_1 = require("../../utils");
const utils_2 = require("../../utils");
const constants_2 = require("./with-jwt/constants");
function sendTryRefreshTokenResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_2.sendNon200Response(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
function sendUnauthorisedResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_2.sendNon200Response(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        yield recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle, userContext: {} });
        utils_2.sendNon200Response(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
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
        if (!sessionScope.startsWith("http://") && !sessionScope.startsWith("https://")) {
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
function getTopLevelDomainForSameSiteResolution(url) {
    let urlObj = new url_1.URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || hostname.startsWith("localhost.org") || utils_1.isAnIpAddress(hostname)) {
        // we treat these as the same TLDs since we can use sameSite lax for all of them.
        return "localhost";
    }
    let parsedURL = psl.parse(hostname);
    if (parsedURL.domain === null) {
        throw new Error("Please make sure that the apiDomain and websiteDomain have correct values");
    }
    return parsedURL.domain;
}
exports.getTopLevelDomainForSameSiteResolution = getTopLevelDomainForSameSiteResolution;
function getURLProtocol(url) {
    let urlObj = new url_1.URL(url);
    return urlObj.protocol;
}
exports.getURLProtocol = getURLProtocol;
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(config.cookieDomain);
    let topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(appInfo.apiDomain.getAsStringDangerous());
    let topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(appInfo.websiteDomain.getAsStringDangerous());
    let protocolOfAPIDomain = getURLProtocol(appInfo.apiDomain.getAsStringDangerous());
    let protocolOfWebsiteDomain = getURLProtocol(appInfo.websiteDomain.getAsStringDangerous());
    let cookieSameSite =
        topLevelAPIDomain !== topLevelWebsiteDomain || protocolOfAPIDomain !== protocolOfWebsiteDomain ? "none" : "lax";
    cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? cookieSameSite
            : normaliseSameSiteOrThrowError(config.cookieSameSite);
    let cookieSecure =
        config === undefined || config.cookieSecure === undefined
            ? appInfo.apiDomain.getAsStringDangerous().startsWith("https")
            : config.cookieSecure;
    let sessionExpiredStatusCode =
        config === undefined || config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    if (config !== undefined && config.antiCsrf !== undefined) {
        if (config.antiCsrf !== "NONE" && config.antiCsrf !== "VIA_CUSTOM_HEADER" && config.antiCsrf !== "VIA_TOKEN") {
            throw new Error("antiCsrf config must be one of 'NONE' or 'VIA_CUSTOM_HEADER' or 'VIA_TOKEN'");
        }
    }
    let antiCsrf =
        config === undefined || config.antiCsrf === undefined
            ? cookieSameSite === "none"
                ? "VIA_CUSTOM_HEADER"
                : "NONE"
            : config.antiCsrf;
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
    };
    if (config !== undefined && config.errorHandlers !== undefined) {
        if (config.errorHandlers.onTokenTheftDetected !== undefined) {
            errorHandlers.onTokenTheftDetected = config.errorHandlers.onTokenTheftDetected;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
    }
    if (
        cookieSameSite === "none" &&
        !cookieSecure &&
        !(
            (topLevelAPIDomain === "localhost" || utils_1.isAnIpAddress(topLevelAPIDomain)) &&
            (topLevelWebsiteDomain === "localhost" || utils_1.isAnIpAddress(topLevelWebsiteDomain))
        )
    ) {
        // We can allow insecure cookie when both website & API domain are localhost or an IP
        // When either of them is a different domain, API domain needs to have https and a secure cookie to work
        throw new Error(
            "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
        );
    }
    let enableJWT = false;
    let accessTokenPayloadJWTPropertyName = "jwt";
    let issuer;
    if (config !== undefined && config.jwt !== undefined && config.jwt.enable === true) {
        enableJWT = true;
        let jwtPropertyName = config.jwt.propertyNameInAccessTokenPayload;
        issuer = config.jwt.issuer;
        if (jwtPropertyName !== undefined) {
            if (jwtPropertyName === constants_2.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY) {
                throw new Error(constants_2.JWT_RESERVED_KEY_USE_ERROR_MESSAGE);
            }
            accessTokenPayloadJWTPropertyName = jwtPropertyName;
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
        refreshTokenPath: appInfo.apiBasePath.appendPath(new normalisedURLPath_1.default(constants_1.REFRESH_API_PATH)),
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        errorHandlers,
        antiCsrf,
        override,
        jwt: {
            enable: enableJWT,
            propertyNameInAccessTokenPayload: accessTokenPayloadJWTPropertyName,
            issuer,
        },
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
function attachCreateOrRefreshSessionResponseToExpressRes(config, res, response) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    cookieAndHeaders_1.setFrontTokenInHeaders(
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    cookieAndHeaders_1.attachAccessTokenToCookie(config, res, accessToken.token, accessToken.expiry);
    cookieAndHeaders_1.attachRefreshTokenToCookie(config, res, refreshToken.token, refreshToken.expiry);
    cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(config, res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }
}
exports.attachCreateOrRefreshSessionResponseToExpressRes = attachCreateOrRefreshSessionResponseToExpressRes;
