import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
} from "./cookieAndHeaders";
import * as express from "express";
import STError from "./error";
import { URL } from "url";
import { normaliseURLDomainOrThrowError, normaliseURLPathOrThrowError } from "../../utils";
import { getRecipeId } from "./index";

export function normaliseSessionScopeOrThrowError(sessionScope: string): string {
    sessionScope = sessionScope.trim().toLowerCase();

    // first we convert it to a URL so that we can use the URL class
    if (sessionScope.startsWith(".")) {
        sessionScope = sessionScope.substr(1);
    }

    if (!sessionScope.startsWith("http://") && !sessionScope.startsWith("https://")) {
        sessionScope = "http://" + sessionScope;
    }

    try {
        let urlObj = new URL(sessionScope);
        sessionScope = urlObj.hostname;

        // add a leading dot
        if (!sessionScope.startsWith(".")) {
            sessionScope = "." + sessionScope;
        }

        return sessionScope;
    } catch (err) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Please provide a valid sessionScope"),
        });
    }
}

export function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput {
    let hosts =
        config.hosts === undefined
            ? normaliseURLDomainOrThrowError("http://localhost:3567", getRecipeId())
            : config.hosts;

    let accessTokenPath =
        config.accessTokenPath === undefined ? "" : normaliseURLPathOrThrowError(config.accessTokenPath, getRecipeId());
    if (accessTokenPath === "") {
        // cookie path being an empty string doesn't work.
        accessTokenPath = "/";
    }

    let apiBasePath =
        config.apiBasePath === undefined
            ? normaliseURLPathOrThrowError("/auth", getRecipeId())
            : normaliseURLPathOrThrowError(config.apiBasePath, getRecipeId());

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

export function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none" {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
        });
    }
    return sameSite;
}

export function attachCreateOrRefreshSessionResponseToExpressRes(
    res: express.Response,
    response: CreateOrRefreshAPIResponse
) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    setFrontTokenInHeaders(res, response.session.userId, response.accessToken.expiry, response.session.userDataInJWT);
    attachAccessTokenToCookie(res, accessToken.token, accessToken.expiry);
    attachRefreshTokenToCookie(res, refreshToken.token, refreshToken.expiry);
    setIdRefreshTokenInHeaderAndCookie(res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }
}
