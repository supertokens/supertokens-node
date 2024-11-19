"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMultipleCookiesForTokenType = exports.clearSessionCookiesFromOlderCookieDomain = exports.getAuthModeFromHeader = exports.setCookie = exports.setHeader = exports.setToken = exports.getToken = exports.getCORSAllowedHeaders = exports.setFrontTokenInHeaders = exports.buildFrontToken = exports.setAntiCsrfTokenInHeaders = exports.getAntiCsrfTokenFromHeaders = exports.clearSession = exports.clearSessionFromAllTokenTransferMethods = void 0;
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
const utils_1 = require("../../utils");
const constants_2 = require("./constants");
const error_1 = __importDefault(require("./error"));
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
    res.removeHeader(constants_2.antiCsrfHeaderKey);
    // This can be added multiple times in some cases, but that should be OK
    res.setHeader(constants_2.frontTokenHeaderKey, "remove", false);
    res.setHeader("Access-Control-Expose-Headers", constants_2.frontTokenHeaderKey, true);
}
exports.clearSession = clearSession;
function getAntiCsrfTokenFromHeaders(req) {
    return req.getHeaderValue(constants_2.antiCsrfHeaderKey);
}
exports.getAntiCsrfTokenFromHeaders = getAntiCsrfTokenFromHeaders;
function setAntiCsrfTokenInHeaders(res, antiCsrfToken) {
    res.setHeader(constants_2.antiCsrfHeaderKey, antiCsrfToken, false);
    res.setHeader("Access-Control-Expose-Headers", constants_2.antiCsrfHeaderKey, true);
}
exports.setAntiCsrfTokenInHeaders = setAntiCsrfTokenInHeaders;
function buildFrontToken(userId, atExpiry, accessTokenPayload) {
    const tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    return utils_1.encodeBase64(JSON.stringify(tokenInfo));
}
exports.buildFrontToken = buildFrontToken;
function setFrontTokenInHeaders(res, frontToken) {
    res.setHeader(constants_2.frontTokenHeaderKey, frontToken, false);
    res.setHeader("Access-Control-Expose-Headers", constants_2.frontTokenHeaderKey, true);
}
exports.setFrontTokenInHeaders = setFrontTokenInHeaders;
function getCORSAllowedHeaders() {
    return [
        constants_2.antiCsrfHeaderKey,
        constants_1.HEADER_RID,
        constants_2.authorizationHeaderKey,
        constants_2.authModeHeaderKey,
    ];
}
exports.getCORSAllowedHeaders = getCORSAllowedHeaders;
function getToken(config, req, tokenType, transferMethod, userContext) {
    if (transferMethod === "cookie") {
        return req.getCookieValue(config.getCookieNameForTokenType(req, tokenType, userContext));
    } else if (transferMethod === "header") {
        const value = req.getHeaderValue(constants_2.authorizationHeaderKey);
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
            config.getCookieNameForTokenType(req, tokenType, userContext),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath",
            req,
            userContext
        );
    } else if (transferMethod === "header") {
        setHeader(res, config.getResponseHeaderNameForTokenType(req, tokenType, userContext), value);
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
    return (_a = req.getHeaderValue(constants_2.authModeHeaderKey)) === null || _a === void 0
        ? void 0
        : _a.toLowerCase();
}
exports.getAuthModeFromHeader = getAuthModeFromHeader;
/**
 *  This function addresses an edge case where changing the cookieDomain config on the server can
 *  lead to session integrity issues. For instance, if the API server URL is 'api.example.com'
 *  with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com',
 *  the client may retain cookies with both '.example.com' and 'api.example.com' domains.
 *
 *  Consequently, if the server chooses the older cookie, session invalidation occurs, potentially
 *  resulting in an infinite refresh loop. To fix this, users are asked to specify "olderCookieDomain" in
 *  the config.
 *
 * This function checks for multiple cookies with the same name and clears the cookies for the older domain
 */
function clearSessionCookiesFromOlderCookieDomain({ req, res, config, userContext }) {
    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });
    // If the transfer method is 'header', there's no need to clear cookies immediately, even if there are multiple in the request.
    if (allowedTransferMethod === "header") {
        return;
    }
    let didClearCookies = false;
    const tokenTypes = ["access", "refresh"];
    for (const token of tokenTypes) {
        if (hasMultipleCookiesForTokenType(config, req, token, userContext)) {
            // If a request has multiple session cookies and 'olderCookieDomain' is
            // unset, we can't identify the correct cookie for refreshing the session.
            // Using the wrong cookie can cause an infinite refresh loop. To avoid this,
            // we throw a 500 error asking the user to set 'olderCookieDomain'.
            if (config.olderCookieDomain === undefined) {
                throw new Error(
                    `The request contains multiple session cookies. This may happen if you've changed the 'cookieDomain' value in your configuration. To clear tokens from the previous domain, set 'olderCookieDomain' in your config.`
                );
            }
            logger_1.logDebugMessage(
                `clearSessionCookiesFromOlderCookieDomain: Clearing duplicate ${token} cookie with domain ${config.olderCookieDomain}`
            );
            setToken(
                Object.assign(Object.assign({}, config), { cookieDomain: config.olderCookieDomain }),
                res,
                token,
                "",
                0,
                "cookie",
                req,
                userContext
            );
            didClearCookies = true;
        }
    }
    if (didClearCookies) {
        throw new error_1.default({
            message:
                "The request contains multiple session cookies. We are clearing the cookie from olderCookieDomain. Session will be refreshed in the next refresh call.",
            type: error_1.default.CLEAR_DUPLICATE_SESSION_COOKIES,
        });
    }
}
exports.clearSessionCookiesFromOlderCookieDomain = clearSessionCookiesFromOlderCookieDomain;
function hasMultipleCookiesForTokenType(config, req, tokenType, userContext) {
    const cookieString = req.getHeaderValue("cookie");
    if (cookieString === undefined) {
        return false;
    }
    const cookies = parseCookieStringFromRequestHeaderAllowingDuplicates(cookieString);
    const cookieName = config.getCookieNameForTokenType(req, tokenType, userContext);
    return cookies[cookieName] !== undefined && cookies[cookieName].length > 1;
}
exports.hasMultipleCookiesForTokenType = hasMultipleCookiesForTokenType;
// This function is required because cookies library (and most of the popular libraries in npm)
// does not support parsing multiple cookies with the same name.
function parseCookieStringFromRequestHeaderAllowingDuplicates(cookieString) {
    const cookies = {};
    const cookiePairs = cookieString.split(";");
    for (const cookiePair of cookiePairs) {
        const [name, value] = cookiePair
            .trim()
            .split("=")
            .map((part) => {
                try {
                    return decodeURIComponent(part);
                } catch (e) {
                    // this is there in case the cookie value is not encoded. This can happe
                    // if the user has set their own cookie in a different format.
                    return part;
                }
            });
        if (cookies.hasOwnProperty(name)) {
            cookies[name].push(value);
        } else {
            cookies[name] = [value];
        }
    }
    return cookies;
}
