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
const error_1 = require("./error");
const utils_1 = require("../../utils");
// TODO: set same-site value for cookies as chrome will soon make that compulsory.
// Setting it to "lax" seems ideal, however there are bugs in safari regarding that. So setting it to "none" might make more sense.
const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";
// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontTokenHeaderKey = "front-token";
/**
 * @description clears all the auth cookies from the response
 */
function clearSessionFromCookie(recipeInstance, res) {
    setCookie(recipeInstance, res, accessTokenCookieKey, "", 0, "accessTokenPath");
    setCookie(recipeInstance, res, refreshTokenCookieKey, "", 0, "refreshTokenPath");
    setCookie(recipeInstance, res, idRefreshTokenCookieKey, "", 0, "accessTokenPath");
    setHeader(recipeInstance, res, idRefreshTokenHeaderKey, "remove", false);
    setHeader(recipeInstance, res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
}
exports.clearSessionFromCookie = clearSessionFromCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachAccessTokenToCookie(recipeInstance, res, token, expiry) {
    setCookie(recipeInstance, res, accessTokenCookieKey, token, expiry, "accessTokenPath");
}
exports.attachAccessTokenToCookie = attachAccessTokenToCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachRefreshTokenToCookie(recipeInstance, res, token, expiry) {
    setCookie(recipeInstance, res, refreshTokenCookieKey, token, expiry, "refreshTokenPath");
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
    return utils_1.getHeader(req, antiCsrfHeaderKey);
}
exports.getAntiCsrfTokenFromHeaders = getAntiCsrfTokenFromHeaders;
function getIdRefreshTokenFromCookie(req) {
    return getCookieValue(req, idRefreshTokenCookieKey);
}
exports.getIdRefreshTokenFromCookie = getIdRefreshTokenFromCookie;
function setAntiCsrfTokenInHeaders(recipeInstance, res, antiCsrfToken) {
    setHeader(recipeInstance, res, antiCsrfHeaderKey, antiCsrfToken, false);
    setHeader(recipeInstance, res, "Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}
exports.setAntiCsrfTokenInHeaders = setAntiCsrfTokenInHeaders;
function setIdRefreshTokenInHeaderAndCookie(recipeInstance, res, idRefreshToken, expiry) {
    setHeader(recipeInstance, res, idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry, false);
    setHeader(recipeInstance, res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
    setCookie(recipeInstance, res, idRefreshTokenCookieKey, idRefreshToken, expiry, "accessTokenPath");
}
exports.setIdRefreshTokenInHeaderAndCookie = setIdRefreshTokenInHeaderAndCookie;
function setFrontTokenInHeaders(recipeInstance, res, userId, atExpiry, jwtPayload) {
    let tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: jwtPayload,
    };
    setHeader(
        recipeInstance,
        res,
        frontTokenHeaderKey,
        Buffer.from(JSON.stringify(tokenInfo)).toString("base64"),
        false
    );
    setHeader(recipeInstance, res, "Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}
exports.setFrontTokenInHeaders = setFrontTokenInHeaders;
function getCORSAllowedHeaders() {
    return [antiCsrfHeaderKey];
}
exports.getCORSAllowedHeaders = getCORSAllowedHeaders;
function setHeader(recipeInstance, res, key, value, allowDuplicateKey) {
    try {
        let existingHeaders = res.getHeaders();
        let existingValue = existingHeaders[key.toLowerCase()];
        if (existingValue === undefined) {
            res.header(key, value);
        } else if (allowDuplicateKey) {
            res.header(key, existingValue + ", " + value);
        } else {
            // we overwrite the current one with the new one
            res.header(key, value);
        }
    } catch (err) {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Error while setting header with key: " + key + " and value: " + value),
            },
            recipeInstance.getRecipeId()
        );
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
function setCookie(recipeInstance, res, name, value, expires, pathType) {
    let domain = recipeInstance.config.cookieDomain;
    let secure = recipeInstance.config.cookieSecure;
    let sameSite = recipeInstance.config.cookieSameSite;
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = recipeInstance.config.refreshTokenPath;
    } else if (pathType === "accessTokenPath") {
        path = recipeInstance.config.accessTokenPath;
    }
    let httpOnly = recipeInstance.config.cookieSecure;
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };
    return append(res, "Set-Cookie", cookie_1.serialize(name, value, opts), name);
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
function append(res, field, val, key) {
    let prev = res.getHeader(field);
    let value = val;
    if (prev !== undefined) {
        // removing existing cookie with the same name
        if (Array.isArray(prev)) {
            let removedDuplicate = [];
            for (let i = 0; i < prev.length; i++) {
                let curr = prev[i];
                if (!curr.startsWith(key)) {
                    removedDuplicate.push(curr);
                }
            }
            prev = removedDuplicate;
        } else {
            if (prev.startsWith(key)) {
                prev = undefined;
            }
        }
        if (prev !== undefined) {
            value = Array.isArray(prev) ? prev.concat(val) : Array.isArray(val) ? [prev].concat(val) : [prev, val];
        }
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
    } catch (err) {
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
