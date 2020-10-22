"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = require("./error");
const url_1 = require("url");
const utils_1 = require("../../utils");
const index_1 = require("./index");
function normaliseSessionScopeOrThrowError(sessionScope) {
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
        // add a leading dot
        if (!sessionScope.startsWith(".")) {
            sessionScope = "." + sessionScope;
        }
        return sessionScope;
    } catch (err) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide a valid sessionScope"),
        });
    }
}
exports.normaliseSessionScopeOrThrowError = normaliseSessionScopeOrThrowError;
function validateAndNormaliseUserInput(config) {
    let hosts =
        config.hosts === undefined
            ? utils_1.normaliseURLDomainOrThrowError("http://localhost:3567", index_1.getRecipeId())
            : config.hosts;
    let accessTokenPath =
        config.accessTokenPath === undefined
            ? ""
            : utils_1.normaliseURLPathOrThrowError(config.accessTokenPath, index_1.getRecipeId());
    if (accessTokenPath === "") {
        // cookie path being an empty string doesn't work.
        accessTokenPath = "/";
    }
    let apiBasePath =
        config.apiBasePath === undefined
            ? utils_1.normaliseURLPathOrThrowError("/auth", index_1.getRecipeId())
            : utils_1.normaliseURLPathOrThrowError(config.apiBasePath, index_1.getRecipeId());
    let cookieDomain =
        config.cookieDomain === undefined ? undefined : normaliseSessionScopeOrThrowError(config.cookieDomain);
    let cookieSameSite =
        config.cookieSameSite === undefined ? "lax" : normaliseSameSiteOrThrowError(config.cookieSameSite);
    let cookieSecure = config.cookieSecure === undefined ? false : config.cookieSecure;
    let sessionExpiredStatusCode =
        config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    return {
        hosts,
        accessTokenPath,
        apiBasePath,
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        apiKey: config.apiKey,
        sessionExpiredStatusCode,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function normaliseSameSiteOrThrowError(sameSite) {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
        });
    }
    return sameSite;
}
exports.normaliseSameSiteOrThrowError = normaliseSameSiteOrThrowError;
function attachCreateOrRefreshSessionResponseToExpressRes(res, response) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    cookieAndHeaders_1.setFrontTokenInHeaders(
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    cookieAndHeaders_1.attachAccessTokenToCookie(res, accessToken.token, accessToken.expiry);
    cookieAndHeaders_1.attachRefreshTokenToCookie(res, refreshToken.token, refreshToken.expiry);
    cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }
}
exports.attachCreateOrRefreshSessionResponseToExpressRes = attachCreateOrRefreshSessionResponseToExpressRes;
//# sourceMappingURL=utils.js.map
