"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthModeFromHeader = exports.setCookie = exports.setHeader = exports.setToken = exports.getToken = exports.getCORSAllowedHeaders = exports.setFrontTokenInHeaders = exports.buildFrontToken = exports.setAntiCsrfTokenInHeaders = exports.getAntiCsrfTokenFromHeaders = exports.clearSession = exports.clearSessionFromAllTokenTransferMethods = void 0;
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
const constants_1 = require("../../constants");
const logger_1 = require("../../logger");
const constants_2 = require("./constants");
const authorizationHeaderKey = "authorization";
const accessTokenCookieKey = "sAccessToken";
const accessTokenHeaderKey = "st-access-token";
const refreshTokenCookieKey = "sRefreshToken";
const refreshTokenHeaderKey = "st-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontTokenHeaderKey = "front-token";
const authModeHeaderKey = "st-auth-mode";
function clearSessionFromAllTokenTransferMethods(config, res, request, userContext) {
    // We are clearing the session in all transfermethods to be sure to override cookies in case they have been already added to the response.
    // This is done to handle the following use-case:
    // If the app overrides signInPOST to check the ban status of the user after the original implementation and throwing an UNAUTHORISED error
    // In this case: the SDK has attached cookies to the response, but none was sent with the request
    // We can't know which to clear since we can't reliably query or remove the set-cookie header added to the response (causes issues in some frameworks, i.e.: hapi)
    // The safe solution in this case is to overwrite all the response cookies/headers with an empty value, which is what we are doing here
    for (const transferMethod of constants_2.availableTokenTransferMethods) {
        clearSession(config, res, transferMethod, request, userContext);
    }
}
exports.clearSessionFromAllTokenTransferMethods = clearSessionFromAllTokenTransferMethods;
function clearSession(config, res, transferMethod, request, userContext) {
    // If we can be specific about which transferMethod we want to clear, there is no reason to clear the other ones
    const tokenTypes = ["access", "refresh"];
    for (const token of tokenTypes) {
        setToken(config, res, token, "", 0, transferMethod, request, userContext);
    }
    res.removeHeader(antiCsrfHeaderKey);
    // This can be added multiple times in some cases, but that should be OK
    res.setHeader(frontTokenHeaderKey, "remove", false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}
exports.clearSession = clearSession;
function getAntiCsrfTokenFromHeaders(req) {
    return req.getHeaderValue(antiCsrfHeaderKey);
}
exports.getAntiCsrfTokenFromHeaders = getAntiCsrfTokenFromHeaders;
function setAntiCsrfTokenInHeaders(res, antiCsrfToken) {
    res.setHeader(antiCsrfHeaderKey, antiCsrfToken, false);
    res.setHeader("Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}
exports.setAntiCsrfTokenInHeaders = setAntiCsrfTokenInHeaders;
function buildFrontToken(userId, atExpiry, accessTokenPayload) {
    const tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    return Buffer.from(JSON.stringify(tokenInfo)).toString("base64");
}
exports.buildFrontToken = buildFrontToken;
function setFrontTokenInHeaders(res, frontToken) {
    res.setHeader(frontTokenHeaderKey, frontToken, false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}
exports.setFrontTokenInHeaders = setFrontTokenInHeaders;
function getCORSAllowedHeaders() {
    return [antiCsrfHeaderKey, constants_1.HEADER_RID, authorizationHeaderKey, authModeHeaderKey];
}
exports.getCORSAllowedHeaders = getCORSAllowedHeaders;
function getCookieNameFromTokenType(tokenType) {
    switch (tokenType) {
        case "access":
            return accessTokenCookieKey;
        case "refresh":
            return refreshTokenCookieKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}
function getResponseHeaderNameForTokenType(tokenType) {
    switch (tokenType) {
        case "access":
            return accessTokenHeaderKey;
        case "refresh":
            return refreshTokenHeaderKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}
function getToken(req, tokenType, transferMethod) {
    if (transferMethod === "cookie") {
        return req.getCookieValue(getCookieNameFromTokenType(tokenType));
    } else if (transferMethod === "header") {
        const value = req.getHeaderValue(authorizationHeaderKey);
        if (value === undefined || !value.startsWith("Bearer ")) {
            return undefined;
        }
        return value.replace(/^Bearer /, "").trim();
    } else {
        throw new Error("Should never happen: Unknown transferMethod: " + transferMethod);
    }
}
exports.getToken = getToken;
function setToken(config, res, tokenType, value, expires, transferMethod, req, userContext) {
    logger_1.logDebugMessage(`setToken: Setting ${tokenType} token as ${transferMethod}`);
    if (transferMethod === "cookie") {
        setCookie(
            config,
            res,
            getCookieNameFromTokenType(tokenType),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath",
            req,
            userContext
        );
    } else if (transferMethod === "header") {
        setHeader(res, getResponseHeaderNameForTokenType(tokenType), value);
    }
}
exports.setToken = setToken;
function setHeader(res, name, value) {
    res.setHeader(name, value, false);
    res.setHeader("Access-Control-Expose-Headers", name, true);
}
exports.setHeader = setHeader;
/**
 *
 * @param res
 * @param name
 * @param value
 * @param domain
 * @param secure
 * @param httpOnly
 * @param expires
 * @param path
 */
function setCookie(config, res, name, value, expires, pathType, req, userContext) {
    let domain = config.cookieDomain;
    let secure = config.cookieSecure;
    let sameSite = config.getCookieSameSite({
        request: req,
        userContext,
    });
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = config.refreshTokenPath.getAsStringDangerous();
    } else if (pathType === "accessTokenPath") {
        path =
            config.accessTokenPath.getAsStringDangerous() === "" ? "/" : config.accessTokenPath.getAsStringDangerous();
    }
    let httpOnly = true;
    return res.setCookie(name, value, domain, secure, httpOnly, expires, path, sameSite);
}
exports.setCookie = setCookie;
function getAuthModeFromHeader(req) {
    var _a;
    return (_a = req.getHeaderValue(authModeHeaderKey)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
}
exports.getAuthModeFromHeader = getAuthModeFromHeader;
