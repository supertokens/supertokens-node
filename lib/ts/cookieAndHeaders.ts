import { parse, serialize } from "cookie";
import * as express from "express";
import { IncomingMessage, ServerResponse } from "http";

import { DeviceInfo } from "./deviceInfo";
import { AuthError, generateError } from "./error";

const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";
const antiCsrfHeaderKey = "anti-csrf";
const frontendSDKNameHeaderKey = "supertokens-sdk-name";
const frontendSDKVersionHeaderKey = "supertokens-sdk-version";

// will be there for all requests that require auth including refresh tokne request
export function saveFrontendInfoFromRequest(req: express.Request) {
    try {
        let name = getHeader(req, frontendSDKNameHeaderKey);
        let version = getHeader(req, frontendSDKVersionHeaderKey);
        if (name !== undefined && version !== undefined) {
            DeviceInfo.getInstance().addToFrontendSDKs({
                name,
                version
            });
        }
    } catch (err) {
        // ignored
    }
}

/**
 * @description clears all the auth cookies from the response
 */
export function clearSessionFromCookie(
    res: express.Response,
    domain: string,
    secure: boolean,
    accessTokenPath: string,
    refreshTokenPath: string
) {
    setCookie(res, accessTokenCookieKey, "", domain, secure, true, 0, accessTokenPath);
    setCookie(res, refreshTokenCookieKey, "", domain, secure, true, 0, refreshTokenPath);
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachAccessTokenToCookie(
    res: express.Response,
    token: string,
    expiry: number,
    domain: string,
    path: string,
    secure: boolean
) {
    setCookie(res, accessTokenCookieKey, token, domain, secure, true, expiry, path);
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachRefreshTokenToCookie(
    res: express.Response,
    token: string,
    expiry: number,
    domain: string,
    path: string,
    secure: boolean
) {
    setCookie(res, refreshTokenCookieKey, token, domain, secure, true, expiry, path);
}

export function getAccessTokenFromCookie(req: express.Request): string | undefined {
    return getCookieValue(req, accessTokenCookieKey);
}

export function getRefreshTokenFromCookie(req: express.Request): string | undefined {
    return getCookieValue(req, refreshTokenCookieKey);
}

export function getAntiCsrfTokenFromHeaders(req: express.Request): string | undefined {
    return getHeader(req, antiCsrfHeaderKey);
}

export function setAntiCsrfTokenInHeaders(res: express.Response, antiCsrfToken: string) {
    setHeader(res, antiCsrfHeaderKey, antiCsrfToken);
    setHeader(res, "Access-Control-Expose-Headers", antiCsrfHeaderKey);
}

export function setIdRefreshTokenInHeader(res: express.Response, idRefreshToken: string, expiry: number) {
    setHeader(res, idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry);
    setHeader(res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey);
}

export function getHeader(req: express.Request, key: string): string | undefined {
    let value = req.headers[key];
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

export function setOptionsAPIHeader(res: express.Response) {
    setHeader(res, "Access-Control-Allow-Headers", antiCsrfHeaderKey);
    setHeader(res, "Access-Control-Allow-Headers", idRefreshTokenHeaderKey);
    setHeader(res, "Access-Control-Allow-Headers", frontendSDKNameHeaderKey);
    setHeader(res, "Access-Control-Allow-Headers", frontendSDKVersionHeaderKey);

    setHeader(res, "Access-Control-Allow-Credentials", "true");
}

function setHeader(res: express.Response, key: string, value: string) {
    try {
        let existingHeaders = res.getHeaders();
        let existingValue = existingHeaders[key.toLowerCase()];
        if (existingValue === undefined) {
            res.header(key, value);
        } else {
            res.header(key, existingValue + ", " + value);
        }
    } catch (err) {
        throw generateError(AuthError.GENERAL_ERROR, err);
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
export function setCookie(
    res: ServerResponse,
    name: string,
    value: string,
    domain: string,
    secure: boolean,
    httpOnly: boolean,
    expires: number,
    path: string
) {
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path
    };

    return append(res, "Set-Cookie", serialize(name, value, opts));
}

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
function append(res: ServerResponse, field: string, val: string | string[]) {
    let prev: string | string[] | undefined = res.getHeader(field) as string | string[] | undefined;
    let value = val;

    if (prev !== undefined) {
        // concat the new and prev vals
        value = Array.isArray(prev) ? prev.concat(val) : Array.isArray(val) ? [prev].concat(val) : [prev, val];
    }

    value = Array.isArray(value) ? value.map(String) : String(value);

    res.setHeader(field, value);
    return res;
}

export function getCookieValue(req: IncomingMessage, key: string): string | undefined {
    if ((req as any).cookies) {
        return (req as any).cookies[key];
    }

    let cookies: any = req.headers.cookie;

    if (cookies === undefined) {
        return undefined;
    }

    cookies = parse(cookies);

    // parse JSON cookies
    cookies = JSONCookies(cookies);

    return (cookies as any)[key];
}

/**
 * Parse JSON cookie string.
 *
 * @param {String} str
 * @return {Object} Parsed object or undefined if not json cookie
 * @public
 */

function JSONCookie(str: string) {
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

function JSONCookies(obj: any) {
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
