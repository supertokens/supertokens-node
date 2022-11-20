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
const authorizationHeaderKey = "authorization";
const accessTokenCookieKey = "sAccessToken";
const accessTokenHeaderKey = "st-access-token";
const refreshTokenCookieKey = "sRefreshToken";
const refreshTokenHeaderKey = "st-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontTokenHeaderKey = "front-token";
/**
 * @description clears all the auth cookies from the response
 */
function clearSession(config, req, res, userContext) {
    // If we can tell it's a cookie based session we are not clearing using headers
    let transferMethod = config.getTokenTransferMethod({ req, userContext });
    if (transferMethod === "MISSING_AUTH_HEADER") {
        transferMethod = "header";
    }
    const tokenTypes = ["access", "refresh"];
    for (const token of tokenTypes) {
        setToken(config, res, token, "", 0, transferMethod);
        // This is to ensure we clear the cookies as well if the user has migrated to headers,
        // because this can't be done on the client side
        if (transferMethod === "header" && isTokenInCookies(req, token)) {
            setToken(config, res, token, "", 0, "cookie");
        }
    }
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
    return [antiCsrfHeaderKey, constants_1.HEADER_RID, authorizationHeaderKey, refreshTokenHeaderKey];
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
function getHeaderNameFromTokenType(tokenType) {
    switch (tokenType) {
        case "access":
            // We are getting the access token from the authorization header during verification.
            // This case is handled in the getToken fn below.
            return accessTokenHeaderKey;
        case "refresh":
            return refreshTokenHeaderKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}
function isTokenInCookies(req, tokenType) {
    return req.getCookieValue(getCookieNameFromTokenType(tokenType)) !== undefined;
}
exports.isTokenInCookies = isTokenInCookies;
function getToken(req, tokenType, transferMethod) {
    if (transferMethod === "cookie") {
        return req.getCookieValue(getCookieNameFromTokenType(tokenType));
    } else if (transferMethod === "header") {
        if (tokenType === "access") {
            const value = req.getHeaderValue(authorizationHeaderKey);
            if (value === undefined || !value.startsWith("Bearer ")) {
                return undefined;
            }
            return value.replace(/^Bearer /, "");
        }
        return req.getHeaderValue(getHeaderNameFromTokenType(tokenType));
    } else {
        throw new Error("Should never happen: Unknown transferMethod: " + transferMethod);
    }
}
exports.getToken = getToken;
function setToken(config, res, tokenType, value, expires, transferMethod) {
    if (transferMethod === "cookie") {
        // We intentionally use accessTokenPath for idRefresh tokens
        setCookie(
            config,
            res,
            getCookieNameFromTokenType(tokenType),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath"
        );
    } else if (transferMethod === "header") {
        setHeader(res, getHeaderNameFromTokenType(tokenType), value, expires);
    }
}
exports.setToken = setToken;
function setHeader(res, name, value, expires) {
    if (value === "remove") {
        res.setHeader(name, value, false);
    } else {
        res.setHeader(name, `${value};${expires}`, false);
    }
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
