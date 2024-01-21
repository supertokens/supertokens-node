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

import { Readable } from "stream";
import { parse, serialize } from "cookie";
import type { Request, Response } from "express";
import type { IncomingMessage } from "http";
import { ServerResponse } from "http";
import STError from "../error";
import type { HTTPMethod } from "../types";
import { COOKIE_HEADER } from "./constants";
import { getFromObjectCaseInsensitive } from "../utils";
import contentType from "content-type";
import inflate from "inflation";

export function getCookieValueFromHeaders(headers: any, key: string): string | undefined {
    if (headers === undefined || headers === null) {
        return undefined;
    }
    let cookies: any = headers.cookie || headers.Cookie;

    if (cookies === undefined) {
        return undefined;
    }

    cookies = parse(cookies);

    // parse JSON cookies
    cookies = JSONCookies(cookies);

    return (cookies as any)[key];
}

export function getCookieValueFromIncomingMessage(request: IncomingMessage, key: string): string | undefined {
    if ((request as any).cookies) {
        return (request as any).cookies[key];
    }

    return getCookieValueFromHeaders(request.headers, key);
}

export function getHeaderValueFromIncomingMessage(request: IncomingMessage, key: string): string | undefined {
    return normalizeHeaderValue(getFromObjectCaseInsensitive(key, request.headers));
}

export function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
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

function getCharset(req: IncomingMessage) {
    try {
        return (contentType.parse(req).parameters.charset || "").toLowerCase();
    } catch (e) {
        return undefined;
    }
}

export async function parseJSONBodyFromRequest(req: IncomingMessage) {
    const encoding = getCharset(req) || "utf-8";
    if (!encoding.startsWith("utf-")) {
        throw new Error(`unsupported charset ${encoding.toUpperCase()}`);
    }
    const buffer = await getBody(inflate(req));
    const str = buffer.toString(encoding as BufferEncoding);

    if (str.length === 0) {
        return {};
    }
    return JSON.parse(str);
}

export async function parseURLEncodedFormData(req: IncomingMessage) {
    const encoding = getCharset(req) || "utf-8";
    if (!encoding.startsWith("utf-")) {
        throw new Error(`unsupported charset ${encoding.toUpperCase()}`);
    }
    const buffer = await getBody(inflate(req));
    const str = buffer.toString(encoding as BufferEncoding);

    let body: any = {};
    for (const [key, val] of new URLSearchParams(str).entries()) {
        if (key in body) {
            if (body[key] instanceof Array) {
                body[key].push(val);
            } else {
                body[key] = [body[key], val];
            }
        } else {
            body[key] = val;
        }
    }
    return body;
}

export async function assertThatBodyParserHasBeenUsedForExpressLikeRequest(method: HTTPMethod, request: Request) {
    // according to https://github.com/supertokens/supertokens-node/issues/33
    if (method === "post" || method === "put") {
        if (typeof request.body === "string") {
            try {
                request.body = JSON.parse(request.body);
            } catch (err) {
                if (request.body === "") {
                    request.body = {};
                } else {
                    throw new STError({
                        type: STError.BAD_INPUT_ERROR,
                        message: "API input error: Please make sure to pass a valid JSON input in the request body",
                    });
                }
            }
        } else if (
            request.body === undefined ||
            Buffer.isBuffer(request.body) ||
            (Object.keys(request.body).length === 0 && request.readable)
        ) {
            try {
                // parsing it again to make sure that the request is parsed atleast once by a json parser
                request.body = await parseJSONBodyFromRequest(request);
            } catch {
                throw new STError({
                    type: STError.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass a valid JSON input in the request body",
                });
            }
        }
    }
}

export async function assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(request: Request) {
    if (typeof request.body === "string") {
        try {
            request.body = Object.fromEntries(new URLSearchParams(request.body).entries());
        } catch (err) {
            if (request.body === "") {
                request.body = {};
            } else {
                throw new STError({
                    type: STError.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass valid url encoded form in the request body",
                });
            }
        }
    } else if (
        request.body === undefined ||
        Buffer.isBuffer(request.body) ||
        (Object.keys(request.body).length === 0 && request.readable)
    ) {
        try {
            // parsing it again to make sure that the request is parsed atleast once by a form data parser
            request.body = await parseURLEncodedFormData(request);
        } catch {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "API input error: Please make sure to pass valid url encoded form in the request body",
            });
        }
    }
}

export function setHeaderForExpressLikeResponse(res: Response, key: string, value: string, allowDuplicateKey: boolean) {
    try {
        let existingHeaders = res.getHeaders();
        let existingValue = existingHeaders[key.toLowerCase()];

        // we have the res.header for compatibility with nextJS
        if (existingValue === undefined) {
            if (res.header !== undefined) {
                res.header(key, value);
            } else {
                res.setHeader(key, value);
            }
        } else if (allowDuplicateKey) {
            /**
                We only want to append if it does not already exist
                For example if the caller is trying to add front token to the access control exposed headers property
                we do not want to append if something else had already added it
            */
            if (typeof existingValue !== "string" || !existingValue.includes(value)) {
                if (res.header !== undefined) {
                    res.header(key, existingValue + ", " + value);
                } else {
                    res.setHeader(key, existingValue + ", " + value);
                }
            }
        } else {
            // we overwrite the current one with the new one
            if (res.header !== undefined) {
                res.header(key, value);
            } else {
                res.setHeader(key, value);
            }
        }
    } catch (err) {
        throw new Error(
            "Error while setting header with key: " + key + " and value: " + value + "\nError: " + (err.message ?? err)
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
export function setCookieForServerResponse(
    res: ServerResponse,
    key: string,
    value: string,
    domain: string | undefined,
    secure: boolean,
    httpOnly: boolean,
    expires: number,
    path: string,
    sameSite: "strict" | "lax" | "none"
) {
    return appendToServerResponse(
        res,
        COOKIE_HEADER,
        serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite),
        key
    );
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
function appendToServerResponse(res: ServerResponse, field: string, val: string | string[], key: string) {
    let prev: string | string[] | undefined = res.getHeader(field) as string | string[] | undefined;
    res.setHeader(field, getCookieValueToSetInHeader(prev, val, key));
    return res;
}

export function getCookieValueToSetInHeader(
    prev: string | string[] | undefined,
    val: string | string[],
    key: string
): string | string[] {
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
    return value;
}

export function serializeCookieValue(
    key: string,
    value: string,
    domain: string | undefined,
    secure: boolean,
    httpOnly: boolean,
    expires: number,
    path: string,
    sameSite: "strict" | "lax" | "none"
): string {
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };

    return serialize(key, value, opts);
}

// based on https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction
function getBody(request: Readable) {
    return new Promise<Buffer>((resolve) => {
        const bodyParts: Uint8Array[] = [];
        request
            .on("data", (chunk) => {
                bodyParts.push(chunk);
            })
            .on("end", () => {
                resolve(Buffer.concat(bodyParts));
            });
    });
}
