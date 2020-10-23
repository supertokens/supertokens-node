import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
} from "./cookieAndHeaders";
import * as express from "express";
import { URL } from "url";
import { normaliseURLPathOrThrowError } from "../../utils";
import SessionRecipe from "./sessionRecipe";

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
        throw new Error("Please provide a valid sessionScope");
    }
}

export function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput {
    let cookieDomain =
        config.cookieDomain === undefined ? undefined : normaliseSessionScopeOrThrowError(config.cookieDomain);

    let cookieSameSite =
        config.cookieSameSite === undefined ? "lax" : normaliseSameSiteOrThrowError(config.cookieSameSite);

    let cookieSecure = config.cookieSecure === undefined ? false : config.cookieSecure;

    let sessionExpiredStatusCode =
        config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;

    let sessionRefreshFeature = {
        disableDefaultImplementation: false,
    };
    if (
        config.sessionRefreshFeature !== undefined &&
        config.sessionRefreshFeature.disableDefaultImplementation !== undefined
    ) {
        sessionRefreshFeature.disableDefaultImplementation = config.sessionRefreshFeature.disableDefaultImplementation;
    }

    return {
        accessTokenPath: "/",
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
    };
}

export function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none" {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new Error('cookie same site must be one of "strict", "lax", or "none"');
    }
    return sameSite;
}

export function attachCreateOrRefreshSessionResponseToExpressRes(
    recipeInstance: SessionRecipe,
    res: express.Response,
    response: CreateOrRefreshAPIResponse
) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    setFrontTokenInHeaders(
        recipeInstance,
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    attachAccessTokenToCookie(recipeInstance, res, accessToken.token, accessToken.expiry);
    attachRefreshTokenToCookie(recipeInstance, res, refreshToken.token, refreshToken.expiry);
    setIdRefreshTokenInHeaderAndCookie(recipeInstance, res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(recipeInstance, res, response.antiCsrfToken);
    }
}
