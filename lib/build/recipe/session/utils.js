"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const url_1 = require("url");
const error_1 = require("./error");
const middleware_1 = require("./middleware");
function normaliseSessionScopeOrThrowError(rId, sessionScope) {
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
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Please provide a valid sessionScope"),
            },
            rId
        );
    }
}
exports.normaliseSessionScopeOrThrowError = normaliseSessionScopeOrThrowError;
function validateAndNormaliseUserInput(recipeInstance, config) {
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(recipeInstance.getRecipeId(), config.cookieDomain);
    let cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? "lax"
            : normaliseSameSiteOrThrowError(recipeInstance.getRecipeId(), config.cookieSameSite);
    let cookieSecure = config === undefined || config.cookieSecure === undefined ? false : config.cookieSecure;
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
        if (config.errorHandlers.onTryRefreshToken !== undefined) {
            errorHandlers.onTryRefreshToken = config.errorHandlers.onTryRefreshToken;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
    }
    return {
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
        errorHandlers,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function normaliseSameSiteOrThrowError(rId, sameSite) {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
            },
            rId
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
//# sourceMappingURL=utils.js.map
