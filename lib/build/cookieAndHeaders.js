"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const cookie_1 = require("cookie");
const deviceInfo_1 = require("./deviceInfo");
const error_1 = require("./error");
// TODO: set same-site value for cookies as chrome will soon make that compulsory.
// Setting it to "lax" seems ideal, however there are bugs in safari regarding that. So setting it to "none" might make more sense.
const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";
// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontendSDKNameHeaderKey = "supertokens-sdk-name";
const frontendSDKVersionHeaderKey = "supertokens-sdk-version";
// will be there for all requests that require auth including refresh token request
function saveFrontendInfoFromRequest(req) {
    try {
        let name = getHeader(req, frontendSDKNameHeaderKey);
        let version = getHeader(req, frontendSDKVersionHeaderKey);
        if (name !== undefined && version !== undefined) {
            deviceInfo_1.DeviceInfo.getInstance().addToFrontendSDKs({
                name,
                version,
            });
        }
    }
    catch (err) {
        // ignored
    }
}
exports.saveFrontendInfoFromRequest = saveFrontendInfoFromRequest;
/**
 * @description clears all the auth cookies from the response
 */
function clearSessionFromCookie(res, domain, secure, accessTokenPath, refreshTokenPath, idRefreshTokenPath, sameSite) {
    setCookie(res, accessTokenCookieKey, "", domain, secure, true, 0, accessTokenPath, sameSite);
    setCookie(res, refreshTokenCookieKey, "", domain, secure, true, 0, refreshTokenPath, sameSite);
    setCookie(res, idRefreshTokenCookieKey, "", domain, secure, true, 0, idRefreshTokenPath, sameSite);
    setHeader(res, idRefreshTokenHeaderKey, "remove");
    setHeader(res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey);
}
exports.clearSessionFromCookie = clearSessionFromCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachAccessTokenToCookie(res, token, expiry, domain, path, secure, sameSite) {
    setCookie(res, accessTokenCookieKey, token, domain, secure, true, expiry, path, sameSite);
}
exports.attachAccessTokenToCookie = attachAccessTokenToCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachRefreshTokenToCookie(res, token, expiry, domain, path, secure, sameSite) {
    setCookie(res, refreshTokenCookieKey, token, domain, secure, true, expiry, path, sameSite);
}
exports.attachRefreshTokenToCookie = attachRefreshTokenToCookie;
function getAccessTokenFromCookie(req) {
    return getCookieValue(req, accessTokenCookieKey);
}
exports.getAccessTokenFromCookie = getAccessTokenFromCookie;
function getRefreshTokenFromCookie(req) {
    return getCookieValue(req, refreshTokenCookieKey);
}
exports.getRefreshTokenFromCookie = getRefreshTokenFromCookie;
function getAntiCsrfTokenFromHeaders(req) {
    return getHeader(req, antiCsrfHeaderKey);
}
exports.getAntiCsrfTokenFromHeaders = getAntiCsrfTokenFromHeaders;
function getIdRefreshTokenFromCookie(req) {
    return getCookieValue(req, idRefreshTokenCookieKey);
}
exports.getIdRefreshTokenFromCookie = getIdRefreshTokenFromCookie;
function setAntiCsrfTokenInHeaders(res, antiCsrfToken) {
    setHeader(res, antiCsrfHeaderKey, antiCsrfToken);
    setHeader(res, "Access-Control-Expose-Headers", antiCsrfHeaderKey);
}
exports.setAntiCsrfTokenInHeaders = setAntiCsrfTokenInHeaders;
function setIdRefreshTokenInHeaderAndCookie(res, idRefreshToken, expiry, domain, secure, path, sameSite) {
    setHeader(res, idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry);
    setHeader(res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey);
    setCookie(res, idRefreshTokenCookieKey, idRefreshToken, domain, secure, true, expiry, path, sameSite);
}
exports.setIdRefreshTokenInHeaderAndCookie = setIdRefreshTokenInHeaderAndCookie;
function getHeader(req, key) {
    let value = req.headers[key];
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
exports.getHeader = getHeader;
function setOptionsAPIHeader(res) {
    setHeader(res, "Access-Control-Allow-Headers", antiCsrfHeaderKey);
    setHeader(res, "Access-Control-Allow-Headers", frontendSDKNameHeaderKey);
    setHeader(res, "Access-Control-Allow-Headers", frontendSDKVersionHeaderKey);
    setHeader(res, "Access-Control-Allow-Credentials", "true");
}
exports.setOptionsAPIHeader = setOptionsAPIHeader;
function setHeader(res, key, value) {
    try {
        let existingHeaders = res.getHeaders();
        let existingValue = existingHeaders[key.toLowerCase()];
        if (existingValue === undefined) {
            res.header(key, value);
        }
        else {
            res.header(key, existingValue + ", " + value);
        }
    }
    catch (err) {
        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
    }
}
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
function setCookie(res, name, value, domain, secure, httpOnly, expires, path, sameSite) {
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };
    return append(res, "Set-Cookie", cookie_1.serialize(name, value, opts));
}
exports.setCookie = setCookie;
/**
 * Append additional header `field` with value `val`.
 *
 * Example:
 *
 *    res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
 *
 * @param {ServerResponse} res
 * @param {string} field
 * @param {string| string[]} val
 */
function append(res, field, val) {
    let prev = res.getHeader(field);
    let value = val;
    if (prev !== undefined) {
        // concat the new and prev vals
        value = Array.isArray(prev) ? prev.concat(val) : Array.isArray(val) ? [prev].concat(val) : [prev, val];
    }
    value = Array.isArray(value) ? value.map(String) : String(value);
    res.setHeader(field, value);
    return res;
}
function getCookieValue(req, key) {
    if (req.cookies) {
        return req.cookies[key];
    }
    let cookies = req.headers.cookie;
    if (cookies === undefined) {
        return undefined;
    }
    cookies = cookie_1.parse(cookies);
    // parse JSON cookies
    cookies = JSONCookies(cookies);
    return cookies[key];
}
exports.getCookieValue = getCookieValue;
/**
 * Parse JSON cookie string.
 *
 * @param {String} str
 * @return {Object} Parsed object or undefined if not json cookie
 * @public
 */
function JSONCookie(str) {
    if (typeof str !== "string" || str.substr(0, 2) !== "j:") {
        return undefined;
    }
    try {
        return JSON.parse(str.slice(2));
    }
    catch (err) {
        return undefined;
    }
}
/**
 * Parse JSON cookies.
 *
 * @param {Object} obj
 * @return {Object}
 * @public
 */
function JSONCookies(obj) {
    let cookies = Object.keys(obj);
    let key;
    let val;
    for (let i = 0; i < cookies.length; i++) {
        key = cookies[i];
        val = JSONCookie(obj[key]);
        if (val) {
            obj[key] = val;
        }
    }
    return obj;
}
//# sourceMappingURL=cookieAndHeaders.js.map