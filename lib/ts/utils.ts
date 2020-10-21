import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
} from "./cookieAndHeaders";
import * as express from "express";
import { AuthError, generateError } from "./error";
import { URL } from "url";

export function normaliseURLPathOrThrowError(input: string): string {
    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        input = urlObj.pathname;

        if (input.charAt(input.length - 1) === "/") {
            return input.substr(0, input.length - 1);
        }

        return input;
    } catch (err) {}
    // not a valid URL

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name + path
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        input = "http://" + input;
        return normaliseURLPathOrThrowError(input);
    }

    if (input.charAt(0) !== "/") {
        input = "/" + input;
    }

    // at this point, we should be able to convert it into a fake URL and recursively call this function.
    try {
        // test that we can convert this to prevent an infinite loop
        new URL("http://example.com" + input);

        return normaliseURLPathOrThrowError("http://example.com" + input);
    } catch (err) {
        throw generateError(AuthError.GENERAL_ERROR, new Error("Please provide a valid URL path"));
    }
}

export function normaliseURLDomainOrThrowError(input: string): string {
    function isAnIpAddress(ipaddress: string) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            ipaddress
        );
    }

    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://") && !input.startsWith("supertokens://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        if (urlObj.protocol === "supertokens:") {
            if (urlObj.hostname.startsWith("localhost") || isAnIpAddress(urlObj.hostname)) {
                input = "http://" + urlObj.host;
            } else {
                input = "https://" + urlObj.host;
            }
        } else {
            input = urlObj.protocol + "//" + urlObj.host;
        }

        return input;
    } catch (err) {}
    // not a valid URL

    if (input.indexOf(".") === 0) {
        input = input.substr(1);
    }

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        // The supertokens:// signifies to the recursive call that the call was made by us.
        input = "supertokens://" + input;

        // at this point, it should be a valid URL. So we test that before doing a recursive call
        try {
            new URL(input);
            return normaliseURLDomainOrThrowError(input);
        } catch (err) {}
    }

    throw generateError(AuthError.GENERAL_ERROR, new Error("Please provide a valid domain name"));
}

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
        throw generateError(AuthError.GENERAL_ERROR, new Error("Please provide a valid sessionScope"));
    }
}

export function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput {
    let hosts = config.hosts === undefined ? normaliseURLDomainOrThrowError("http://localhost:3567") : config.hosts;

    let accessTokenPath =
        config.accessTokenPath === undefined ? "" : normaliseURLPathOrThrowError(config.accessTokenPath);
    if (accessTokenPath === "") {
        // cookie path being an empty string doesn't work.
        accessTokenPath = "/";
    }

    let apiBasePath =
        config.apiBasePath === undefined
            ? normaliseURLPathOrThrowError("/auth")
            : normaliseURLPathOrThrowError(config.apiBasePath);

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
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error('cookie same site must be one of "strict", "lax", or "none"')
        );
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

export function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined {
    let intersection = v1.filter((value) => v2.indexOf(value) !== -1);
    if (intersection.length === 0) {
        return undefined;
    }
    let maxVersionSoFar = intersection[0];
    for (let i = 1; i < intersection.length; i++) {
        maxVersionSoFar = maxVersion(intersection[i], maxVersionSoFar);
    }
    return maxVersionSoFar;
}

export function maxVersion(version1: string, version2: string): string {
    let splittedv1 = version1.split(".");
    let splittedv2 = version2.split(".");
    let minLength = Math.min(splittedv1.length, splittedv2.length);
    for (let i = 0; i < minLength; i++) {
        let v1 = Number(splittedv1[i]);
        let v2 = Number(splittedv2[i]);
        if (v1 > v2) {
            return version1;
        } else if (v2 > v1) {
            return version2;
        }
    }
    if (splittedv1.length >= splittedv2.length) {
        return version1;
    }
    return version2;
}
