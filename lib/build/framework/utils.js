"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCookieValue = exports.getCookieValueToSetInHeader = exports.setCookieForServerResponse = exports.setHeaderForExpressLikeResponse = exports.assertFormDataBodyParserHasBeenUsedForExpressLikeRequest = exports.assertThatBodyParserHasBeenUsedForExpressLikeRequest = exports.parseURLEncodedFormData = exports.parseJSONBodyFromRequest = exports.normalizeHeaderValue = exports.getHeaderValueFromIncomingMessage = exports.getCookieValueFromIncomingMessage = exports.getCookieValueFromHeaders = void 0;
const cookie_1 = require("cookie");
const error_1 = __importDefault(require("../error"));
const constants_1 = require("./constants");
const utils_1 = require("../utils");
const content_type_1 = __importDefault(require("content-type"));
const inflation_1 = __importDefault(require("inflation"));
function getCookieValueFromHeaders(headers, key) {
    if (headers === undefined || headers === null) {
        return undefined;
    }
    let cookies = headers.cookie || headers.Cookie;
    if (cookies === undefined) {
        return undefined;
    }
    cookies = cookie_1.parse(cookies);
    // parse JSON cookies
    cookies = JSONCookies(cookies);
    return cookies[key];
}
exports.getCookieValueFromHeaders = getCookieValueFromHeaders;
function getCookieValueFromIncomingMessage(request, key) {
    if (request.cookies) {
        return request.cookies[key];
    }
    return getCookieValueFromHeaders(request.headers, key);
}
exports.getCookieValueFromIncomingMessage = getCookieValueFromIncomingMessage;
function getHeaderValueFromIncomingMessage(request, key) {
    return normalizeHeaderValue(utils_1.getFromObjectCaseInsensitive(key, request.headers));
}
exports.getHeaderValueFromIncomingMessage = getHeaderValueFromIncomingMessage;
function normalizeHeaderValue(value) {
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
exports.normalizeHeaderValue = normalizeHeaderValue;
/**
 * Parse JSON cookie string.
 *
 * @param {String} str
 * @return {Object} Parsed object or undefined if not json cookie
 * @public
 */
function JSONCookie(str) {
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
function JSONCookies(obj) {
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
function getCharset(req) {
    try {
        return (content_type_1.default.parse(req).parameters.charset || "").toLowerCase();
    } catch (e) {
        return undefined;
    }
}
async function parseJSONBodyFromRequest(req) {
    const encoding = getCharset(req) || "utf-8";
    if (!encoding.startsWith("utf-")) {
        throw new Error(`unsupported charset ${encoding.toUpperCase()}`);
    }
    const buffer = await getBody(inflation_1.default(req));
    const str = buffer.toString(encoding);
    if (str.length === 0) {
        return {};
    }
    return JSON.parse(str);
}
exports.parseJSONBodyFromRequest = parseJSONBodyFromRequest;
async function parseURLEncodedFormData(req) {
    const encoding = getCharset(req) || "utf-8";
    if (!encoding.startsWith("utf-")) {
        throw new Error(`unsupported charset ${encoding.toUpperCase()}`);
    }
    const buffer = await getBody(inflation_1.default(req));
    const str = buffer.toString(encoding);
    let body = {};
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
exports.parseURLEncodedFormData = parseURLEncodedFormData;
async function assertThatBodyParserHasBeenUsedForExpressLikeRequest(method, request) {
    // according to https://github.com/supertokens/supertokens-node/issues/33
    if (method === "post" || method === "put") {
        if (typeof request.body === "string") {
            try {
                request.body = JSON.parse(request.body);
            } catch (err) {
                if (request.body === "") {
                    request.body = {};
                } else {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
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
            } catch (_a) {
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass a valid JSON input in the request body",
                });
            }
        }
    }
}
exports.assertThatBodyParserHasBeenUsedForExpressLikeRequest = assertThatBodyParserHasBeenUsedForExpressLikeRequest;
async function assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(request) {
    if (typeof request.body === "string") {
        try {
            request.body = Object.fromEntries(new URLSearchParams(request.body).entries());
        } catch (err) {
            if (request.body === "") {
                request.body = {};
            } else {
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
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
        } catch (_a) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "API input error: Please make sure to pass valid url encoded form in the request body",
            });
        }
    }
}
exports.assertFormDataBodyParserHasBeenUsedForExpressLikeRequest = assertFormDataBodyParserHasBeenUsedForExpressLikeRequest;
function setHeaderForExpressLikeResponse(res, key, value, allowDuplicateKey) {
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
        throw new Error("Error while setting header with key: " + key + " and value: " + value);
    }
}
exports.setHeaderForExpressLikeResponse = setHeaderForExpressLikeResponse;
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
function setCookieForServerResponse(res, key, value, domain, secure, httpOnly, expires, path, sameSite) {
    return appendToServerResponse(
        res,
        constants_1.COOKIE_HEADER,
        serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite),
        key
    );
}
exports.setCookieForServerResponse = setCookieForServerResponse;
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
function appendToServerResponse(res, field, val, key) {
    let prev = res.getHeader(field);
    res.setHeader(field, getCookieValueToSetInHeader(prev, val, key));
    return res;
}
function getCookieValueToSetInHeader(prev, val, key) {
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
exports.getCookieValueToSetInHeader = getCookieValueToSetInHeader;
function serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite) {
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };
    return cookie_1.serialize(key, value, opts);
}
exports.serializeCookieValue = serializeCookieValue;
// based on https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction
function getBody(request) {
    return new Promise((resolve) => {
        const bodyParts = [];
        request
            .on("data", (chunk) => {
                bodyParts.push(chunk);
            })
            .on("end", () => {
                resolve(Buffer.concat(bodyParts));
            });
    });
}
