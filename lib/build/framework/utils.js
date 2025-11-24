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
var __asyncValues =
    (this && this.__asyncValues) ||
    function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator],
            i;
        return m
            ? m.call(o)
            : ((o = typeof __values === "function" ? __values(o) : o[Symbol.iterator]()),
              (i = {}),
              verb("next"),
              verb("throw"),
              verb("return"),
              (i[Symbol.asyncIterator] = function () {
                  return this;
              }),
              i);
        function verb(n) {
            i[n] =
                o[n] &&
                function (v) {
                    return new Promise(function (resolve, reject) {
                        (v = o[n](v)), settle(resolve, reject, v.done, v.value);
                    });
                };
        }
        function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function (v) {
                resolve({ value: v, done: d });
            }, reject);
        }
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieValueFromHeaders = getCookieValueFromHeaders;
exports.getCookieValueFromIncomingMessage = getCookieValueFromIncomingMessage;
exports.getHeaderValueFromIncomingMessage = getHeaderValueFromIncomingMessage;
exports.normalizeHeaderValue = normalizeHeaderValue;
exports.parseJSONBodyFromRequest = parseJSONBodyFromRequest;
exports.parseURLEncodedFormData = parseURLEncodedFormData;
exports.assertThatBodyParserHasBeenUsedForExpressLikeRequest = assertThatBodyParserHasBeenUsedForExpressLikeRequest;
exports.assertFormDataBodyParserHasBeenUsedForExpressLikeRequest =
    assertFormDataBodyParserHasBeenUsedForExpressLikeRequest;
exports.setHeaderForExpressLikeResponse = setHeaderForExpressLikeResponse;
exports.setCookieForServerResponse = setCookieForServerResponse;
exports.getCookieValueToSetInHeader = getCookieValueToSetInHeader;
exports.serializeCookieValue = serializeCookieValue;
exports.isBoxedPrimitive = isBoxedPrimitive;
const cookie_1 = require("cookie");
const error_1 = __importDefault(require("../error"));
const constants_1 = require("./constants");
const utils_1 = require("../utils");
const content_type_1 = __importDefault(require("content-type"));
const pako_1 = __importDefault(require("pako"));
async function inflate(stream) {
    var _a, e_1, _b, _c, _d, e_2, _e, _f;
    if (!stream) {
        throw new TypeError("argument stream is required");
    }
    const encoding = (stream.headers && stream.headers["content-encoding"]) || "identity";
    let decompressedData;
    if (encoding === "gzip" || encoding === "deflate") {
        const inflator = new pako_1.default.Inflate();
        try {
            for (
                var _g = true, stream_1 = __asyncValues(stream), stream_1_1;
                (stream_1_1 = await stream_1.next()), (_a = stream_1_1.done), !_a;
                _g = true
            ) {
                _c = stream_1_1.value;
                _g = false;
                const chunk = _c;
                inflator.push(chunk, false);
            }
        } catch (e_1_1) {
            e_1 = { error: e_1_1 };
        } finally {
            try {
                if (!_g && !_a && (_b = stream_1.return)) await _b.call(stream_1);
            } finally {
                if (e_1) throw e_1.error;
            }
        }
        if (inflator.err) {
            throw new Error(`Decompression error: ${inflator.msg}`);
        }
        decompressedData = inflator.result;
    } else if (encoding === "br") {
        throw new Error(constants_1.BROTLI_DECOMPRESSION_ERROR_MESSAGE);
    } else {
        // Handle identity or unsupported encoding
        decompressedData = (0, utils_1.getBuffer)().concat([]);
        try {
            for (
                var _h = true, stream_2 = __asyncValues(stream), stream_2_1;
                (stream_2_1 = await stream_2.next()), (_d = stream_2_1.done), !_d;
                _h = true
            ) {
                _f = stream_2_1.value;
                _h = false;
                const chunk = _f;
                decompressedData = (0, utils_1.getBuffer)().concat([decompressedData, chunk]);
            }
        } catch (e_2_1) {
            e_2 = { error: e_2_1 };
        } finally {
            try {
                if (!_h && !_d && (_e = stream_2.return)) await _e.call(stream_2);
            } finally {
                if (e_2) throw e_2.error;
            }
        }
    }
    if (typeof decompressedData === "string") return decompressedData;
    return new TextDecoder().decode(decompressedData);
}
function getCookieValueFromHeaders(headers, key) {
    if (headers === undefined || headers === null) {
        return undefined;
    }
    let cookies = headers.cookie || headers.Cookie;
    if (cookies === undefined) {
        return undefined;
    }
    cookies = (0, cookie_1.parse)(cookies);
    // parse JSON cookies
    cookies = JSONCookies(cookies);
    return cookies[key];
}
function getCookieValueFromIncomingMessage(request, key) {
    if (request.cookies) {
        return request.cookies[key];
    }
    return getCookieValueFromHeaders(request.headers, key);
}
function getHeaderValueFromIncomingMessage(request, key) {
    return normalizeHeaderValue((0, utils_1.getFromObjectCaseInsensitive)(key, request.headers));
}
function normalizeHeaderValue(value) {
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
    const str = await inflate(req);
    if (str.length === 0) {
        return {};
    }
    return JSON.parse(str);
}
async function parseURLEncodedFormData(req) {
    const encoding = getCharset(req) || "utf-8";
    if (!encoding.startsWith("utf-")) {
        throw new Error(`unsupported charset ${encoding.toUpperCase()}`);
    }
    const str = await inflate(req);
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
            (0, utils_1.isBuffer)(request.body) ||
            (Object.keys(request.body).length === 0 && request.readable)
        ) {
            try {
                // parsing it again to make sure that the request is parsed atleast once by a json parser
                request.body = await parseJSONBodyFromRequest(request);
            } catch (err) {
                // If the error message matches the brotli decompression
                // related error, then throw that error.
                if (err.message === constants_1.BROTLI_DECOMPRESSION_ERROR_MESSAGE) {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: `API input error: ${constants_1.BROTLI_DECOMPRESSION_ERROR_MESSAGE}`,
                    });
                }
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass a valid JSON input in the request body",
                });
            }
        }
    }
}
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
        (0, utils_1.isBuffer)(request.body) ||
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
function setHeaderForExpressLikeResponse(res, key, value, allowDuplicateKey) {
    var _a;
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
            "Error while setting header with key: " +
                key +
                " and value: " +
                value +
                "\nError: " +
                ((_a = err.message) !== null && _a !== void 0 ? _a : err)
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
function setCookieForServerResponse(res, key, value, domain, secure, httpOnly, expires, path, sameSite) {
    return appendToServerResponse(
        res,
        constants_1.COOKIE_HEADER,
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
function serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite) {
    let opts = {
        domain,
        secure,
        httpOnly,
        expires: new Date(expires),
        path,
        sameSite,
    };
    return (0, cookie_1.serialize)(key, value, opts);
}
function isBoxedPrimitive(value) {
    const boxedTypes = [Boolean, Number, String, Symbol, BigInt];
    return boxedTypes.some((type) => value instanceof type);
}
