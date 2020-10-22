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
import { parse, serialize } from "cookie";
import * as express from "express";
import { IncomingMessage, ServerResponse } from "http";

import STError from "./error";

// TODO: set same-site value for cookies as chrome will soon make that compulsory.
// Setting it to "lax" seems ideal, however there are bugs in safari regarding that. So setting it to "none" might make more sense.

const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";

// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";

const antiCsrfHeaderKey = "anti-csrf";

const frontTokenHeaderKey = "front-token";

export class CookieConfig {
    private static instance: CookieConfig | undefined = undefined;
    accessTokenPath: string;
    refreshTokenPath: string;
    cookieDomain: string | undefined;
    cookieSecure: boolean;
    cookieSameSite: "strict" | "lax" | "none";
    constructor(
        accessTokenPath: string,
        refreshTokenPath: string,
        cookieDomain: string | undefined,
        cookieSecure: boolean,
        cookieSameSite: "strict" | "lax" | "none"
    ) {
        this.accessTokenPath = accessTokenPath;
        this.refreshTokenPath = refreshTokenPath;
        this.cookieDomain = cookieDomain;
        this.cookieSameSite = cookieSameSite;
        this.cookieSecure = cookieSecure;
    }

    static init(
        accessTokenPath: string,
        apiBasePath: string,
        cookieDomain: string | undefined,
        cookieSecure: boolean,
        cookieSameSite: "strict" | "lax" | "none"
    ) {
        if (CookieConfig.instance === undefined) {
            CookieConfig.instance = new CookieConfig(
                accessTokenPath,
                apiBasePath + "/session/refresh",
                cookieDomain,
                cookieSecure,
                cookieSameSite
            );
        }
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        CookieConfig.instance = undefined;
    }

    static getInstanceOrThrowError() {
        if (CookieConfig.instance === undefined) {
            throw new Error("Please call the init function before using SuperTokens");
        }
        return CookieConfig.instance;
    }
}

/**
 * @description clears all the auth cookies from the response
 */
export function clearSessionFromCookie(res: express.Response) {
    setCookie(res, accessTokenCookieKey, "", 0, "accessTokenPath");
    setCookie(res, refreshTokenCookieKey, "", 0, "refreshTokenPath");
    setCookie(res, idRefreshTokenCookieKey, "", 0, "accessTokenPath");
    setHeader(res, idRefreshTokenHeaderKey, "remove", false);
    setHeader(res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachAccessTokenToCookie(res: express.Response, token: string, expiry: number) {
    setCookie(res, accessTokenCookieKey, token, expiry, "accessTokenPath");
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachRefreshTokenToCookie(res: express.Response, token: string, expiry: number) {
    setCookie(res, refreshTokenCookieKey, token, expiry, "refreshTokenPath");
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

export function getIdRefreshTokenFromCookie(req: express.Request): string | undefined {
    return getCookieValue(req, idRefreshTokenCookieKey);
}

export function setAntiCsrfTokenInHeaders(res: express.Response, antiCsrfToken: string) {
    setHeader(res, antiCsrfHeaderKey, antiCsrfToken, false);
    setHeader(res, "Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}

export function setIdRefreshTokenInHeaderAndCookie(res: express.Response, idRefreshToken: string, expiry: number) {
    setHeader(res, idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry, false);
    setHeader(res, "Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);

    setCookie(res, idRefreshTokenCookieKey, idRefreshToken, expiry, "accessTokenPath");
}

export function setFrontTokenInHeaders(res: express.Response, userId: string, atExpiry: number, jwtPayload: any) {
    let tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: jwtPayload,
    };
    setHeader(res, frontTokenHeaderKey, Buffer.from(JSON.stringify(tokenInfo)).toString("base64"), false);
    setHeader(res, "Access-Control-Expose-Headers", frontTokenHeaderKey, true);
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
    setHeader(res, "Access-Control-Allow-Headers", antiCsrfHeaderKey, true);
    setHeader(res, "Access-Control-Allow-Credentials", "true", false);
}

export function getCORSAllowedHeaders(): string[] {
    return [antiCsrfHeaderKey];
}

function setHeader(res: express.Response, key: string, value: string, allowDuplicateKey: boolean) {
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
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Error while setting header with key: " + key + " and value: " + value),
        });
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
    expires: number,
    pathType: "refreshTokenPath" | "accessTokenPath"
) {
    let domain = CookieConfig.getInstanceOrThrowError().cookieDomain;
    let secure = CookieConfig.getInstanceOrThrowError().cookieSecure;
    let sameSite = CookieConfig.getInstanceOrThrowError().cookieSameSite;
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = CookieConfig.getInstanceOrThrowError().refreshTokenPath;
    } else if (pathType === "accessTokenPath") {
        path = CookieConfig.getInstanceOrThrowError().accessTokenPath;
    }
    let httpOnly = CookieConfig.getInstanceOrThrowError().cookieSecure;
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };

    return append(res, "Set-Cookie", serialize(name, value, opts), name);
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
function append(res: ServerResponse, field: string, val: string | string[], key: string) {
    let prev: string | string[] | undefined = res.getHeader(field) as string | string[] | undefined;
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
