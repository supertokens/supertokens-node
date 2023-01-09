"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const constants_2 = require("./constants");
const authorizationHeaderKey = "authorization";
const accessTokenCookieKey = "sAccessToken";
const accessTokenHeaderKey = "st-access-token";
const refreshTokenCookieKey = "sRefreshToken";
const refreshTokenHeaderKey = "st-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontTokenHeaderKey = "front-token";
const authModeHeaderKey = "st-auth-mode";
function clearSessionFromAllTokenTransferMethods(config, req, res) {
    const tokenTypes = ["access", "refresh"];
    removeTokenUpdatesFromResponse(res);
    for (const transferMethod of constants_2.availableTokenTransferMethods) {
        if (tokenTypes.some((type) => getToken(req, type, transferMethod) !== undefined)) {
            clearSession(config, res, transferMethod);
        }
    }
}
exports.clearSessionFromAllTokenTransferMethods = clearSessionFromAllTokenTransferMethods;
function clearSession(config, res, transferMethod) {
    const tokenTypes = ["access", "refresh"];
    for (const token of tokenTypes) {
        setToken(config, res, token, "", 0, transferMethod);
    }
    res.removeHeader(antiCsrfHeaderKey);
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
function setFrontTokenInHeaders(res, userId, atExpiry, accessTokenPayload) {
    const tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    res.setHeader(frontTokenHeaderKey, Buffer.from(JSON.stringify(tokenInfo)).toString("base64"), false);
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
function setToken(config, res, tokenType, value, expires, transferMethod) {
    if (transferMethod === "cookie") {
        setCookie(
            config,
            res,
            getCookieNameFromTokenType(tokenType),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath"
        );
    } else if (transferMethod === "header") {
        setHeader(res, getResponseHeaderNameForTokenType(tokenType), value);
    }
}
exports.setToken = setToken;
function removeTokenUpdatesFromResponse(res) {
    res.removeHeader(antiCsrfHeaderKey);
    res.removeHeader(frontTokenHeaderKey);
    res.removeHeader(getResponseHeaderNameForTokenType("access"));
    res.removeHeader(getResponseHeaderNameForTokenType("refresh"));
    res.clearCookie(getCookieNameFromTokenType("access"));
    res.clearCookie(getCookieNameFromTokenType("refresh"));
}
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
function setCookie(config, res, name, value, expires, pathType) {
    let domain = config.cookieDomain;
    let secure = config.cookieSecure;
    let sameSite = config.cookieSameSite;
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = config.refreshTokenPath.getAsStringDangerous();
    } else if (pathType === "accessTokenPath") {
        path = "/";
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
