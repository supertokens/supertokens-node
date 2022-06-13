"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";
// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const ridHeaderKey = "rid";
const frontTokenHeaderKey = "front-token";
/**
 * @description clears all the auth cookies from the response
 */
function clearSessionFromCookie(config, res) {
    setCookie(config, res, accessTokenCookieKey, "", 0, "accessTokenPath");
    setCookie(config, res, refreshTokenCookieKey, "", 0, "refreshTokenPath");
    setCookie(config, res, idRefreshTokenCookieKey, "", 0, "accessTokenPath");
    res.setHeader(idRefreshTokenHeaderKey, "remove", false);
    res.setHeader("Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
}
exports.clearSessionFromCookie = clearSessionFromCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachAccessTokenToCookie(config, res, token, expiry) {
    setCookie(config, res, accessTokenCookieKey, token, expiry, "accessTokenPath");
}
exports.attachAccessTokenToCookie = attachAccessTokenToCookie;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
function attachRefreshTokenToCookie(config, res, token, expiry) {
    setCookie(config, res, refreshTokenCookieKey, token, expiry, "refreshTokenPath");
}
exports.attachRefreshTokenToCookie = attachRefreshTokenToCookie;
function getAccessTokenFromCookie(req) {
    return req.getCookieValue(accessTokenCookieKey);
}
exports.getAccessTokenFromCookie = getAccessTokenFromCookie;
function getRefreshTokenFromCookie(req) {
    return req.getCookieValue(refreshTokenCookieKey);
}
exports.getRefreshTokenFromCookie = getRefreshTokenFromCookie;
function getAntiCsrfTokenFromHeaders(req) {
    return req.getHeaderValue(antiCsrfHeaderKey);
}
exports.getAntiCsrfTokenFromHeaders = getAntiCsrfTokenFromHeaders;
function getRidFromHeader(req) {
    return req.getHeaderValue(ridHeaderKey);
}
exports.getRidFromHeader = getRidFromHeader;
function getIdRefreshTokenFromCookie(req) {
    return req.getCookieValue(idRefreshTokenCookieKey);
}
exports.getIdRefreshTokenFromCookie = getIdRefreshTokenFromCookie;
function setAntiCsrfTokenInHeaders(res, antiCsrfToken) {
    res.setHeader(antiCsrfHeaderKey, antiCsrfToken, false);
    res.setHeader("Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}
exports.setAntiCsrfTokenInHeaders = setAntiCsrfTokenInHeaders;
function setIdRefreshTokenInHeaderAndCookie(config, res, idRefreshToken, expiry) {
    res.setHeader(idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry, false);
    res.setHeader("Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
    setCookie(config, res, idRefreshTokenCookieKey, idRefreshToken, expiry, "accessTokenPath");
}
exports.setIdRefreshTokenInHeaderAndCookie = setIdRefreshTokenInHeaderAndCookie;
function setFrontTokenInHeaders(res, userId, atExpiry, accessTokenPayload) {
    let tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    res.setHeader(frontTokenHeaderKey, Buffer.from(JSON.stringify(tokenInfo)).toString("base64"), false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}
exports.setFrontTokenInHeaders = setFrontTokenInHeaders;
function getCORSAllowedHeaders() {
    return [antiCsrfHeaderKey, ridHeaderKey];
}
exports.getCORSAllowedHeaders = getCORSAllowedHeaders;
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
