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
const types_1 = require("./types");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const url_1 = require("url");
const error_1 = require("./error");
const middleware_1 = require("./middleware");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const psl = require("psl");
const utils_1 = require("../../utils");
const fs_1 = require("fs");
function normaliseSessionScopeOrThrowError(recipe, sessionScope) {
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
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("Please provide a valid sessionScope"),
                },
                recipe
            );
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
function getTopLevelDomainForSameSiteResolution(url, recipeInstance) {
    let urlObj = new url_1.URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || hostname.startsWith("localhost.org") || utils_1.isAnIpAddress(hostname)) {
        // we treat these as the same TLDs since we can use sameSite lax for all of them.
        return "localhost";
    }
    let parsedURL = psl.parse(hostname);
    if (parsedURL.domain === null) {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Please make sure that the apiDomain and websiteDomain have correct values"),
            },
            recipeInstance
        );
    }
    return parsedURL.domain;
}
exports.getTopLevelDomainForSameSiteResolution = getTopLevelDomainForSameSiteResolution;
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "session recipe", recipeInstance);
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(recipeInstance, config.cookieDomain);
    let topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(
        appInfo.apiDomain.getAsStringDangerous(),
        recipeInstance
    );
    let topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(
        appInfo.websiteDomain.getAsStringDangerous(),
        recipeInstance
    );
    let cookieSameSite = topLevelAPIDomain !== topLevelWebsiteDomain ? "none" : "lax";
    cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? cookieSameSite
            : normaliseSameSiteOrThrowError(recipeInstance, config.cookieSameSite);
    let cookieSecure =
        config === undefined || config.cookieSecure === undefined
            ? appInfo.apiDomain.getAsStringDangerous().startsWith("https")
            : config.cookieSecure;
    let sessionExpiredStatusCode =
        config === undefined || config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    let sessionRefreshFeature = {
        disableDefaultImplementation: false,
    };
    if (
        config !== undefined &&
        config.sessionRefreshFeature !== undefined &&
        config.sessionRefreshFeature.disableDefaultImplementation !== undefined
    ) {
        sessionRefreshFeature.disableDefaultImplementation = config.sessionRefreshFeature.disableDefaultImplementation;
    }
    let enableAntiCsrf =
        config === undefined || config.enableAntiCsrf === undefined ? cookieSameSite === "none" : config.enableAntiCsrf;
    let errorHandlers = {
        onTokenTheftDetected: (sessionHandle, userId, request, response, next) => {
            return middleware_1.sendTokenTheftDetectedResponse(
                recipeInstance,
                sessionHandle,
                userId,
                request,
                response,
                next
            );
        },
        onTryRefreshToken: (message, request, response, next) => {
            return middleware_1.sendTryRefreshTokenResponse(recipeInstance, message, request, response, next);
        },
        onUnauthorised: (message, request, response, next) => {
            return middleware_1.sendUnauthorisedResponse(recipeInstance, message, request, response, next);
        },
    };
    if (config !== undefined && config.errorHandlers !== undefined) {
        if (config.errorHandlers.onTokenTheftDetected !== undefined) {
            errorHandlers.onTokenTheftDetected = config.errorHandlers.onTokenTheftDetected;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
    }
    if (cookieSameSite === "none" && !enableAntiCsrf) {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error(
                    'Security error: enableAntiCsrf can\'t be set to false if cookieSameSite value is "none".'
                ),
            },
            recipeInstance
        );
    }
    if (
        cookieSameSite === "none" &&
        !cookieSecure &&
        !(topLevelAPIDomain === "localhost" || utils_1.isAnIpAddress(topLevelAPIDomain)) &&
        !(topLevelWebsiteDomain === "localhost" || utils_1.isAnIpAddress(topLevelWebsiteDomain))
    ) {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error(
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                ),
            },
            recipeInstance
        );
    }
    return {
        refreshTokenPath: appInfo.apiBasePath.appendPath(
            recipeInstance,
            new normalisedURLPath_1.default(recipeInstance, constants_1.REFRESH_API_PATH)
        ),
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
        errorHandlers,
        enableAntiCsrf,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function normaliseSameSiteOrThrowError(recipe, sameSite) {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
            },
            recipe
        );
    }
    return sameSite;
}
exports.normaliseSameSiteOrThrowError = normaliseSameSiteOrThrowError;
function attachCreateOrRefreshSessionResponseToExpressRes(recipeInstance, res, response) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    cookieAndHeaders_1.setFrontTokenInHeaders(
        recipeInstance,
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    cookieAndHeaders_1.attachAccessTokenToCookie(recipeInstance, res, accessToken.token, accessToken.expiry);
    cookieAndHeaders_1.attachRefreshTokenToCookie(recipeInstance, res, refreshToken.token, refreshToken.expiry);
    cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(
        recipeInstance,
        res,
        idRefreshToken.token,
        idRefreshToken.expiry
    );
    if (response.antiCsrfToken !== undefined) {
        cookieAndHeaders_1.setAntiCsrfTokenInHeaders(recipeInstance, res, response.antiCsrfToken);
    }
}
exports.attachCreateOrRefreshSessionResponseToExpressRes = attachCreateOrRefreshSessionResponseToExpressRes;
function getHandshakeInfoFromFileIfExists() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let handshakeInfoFromFile = yield new Promise((resolve, reject) => {
                fs_1.readFile(constants_1.HANDSHAKE_INFO_FILE_PATH, (err, data) => {
                    if (err !== undefined && err !== null) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            return JSON.parse(handshakeInfoFromFile.toString());
        } catch (err) {
            return null;
        }
    });
}
exports.getHandshakeInfoFromFileIfExists = getHandshakeInfoFromFileIfExists;
function storeHandshakeInfoInFile(handshakeInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield new Promise((resolve, reject) => {
                fs_1.writeFile(constants_1.HANDSHAKE_INFO_FILE_PATH, JSON.stringify(handshakeInfo), {}, () => {
                    resolve(undefined);
                });
            });
        } catch (err) {}
    });
}
exports.storeHandshakeInfoInFile = storeHandshakeInfoInFile;
//# sourceMappingURL=utils.js.map
