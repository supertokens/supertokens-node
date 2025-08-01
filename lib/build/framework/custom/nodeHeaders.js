"use strict";
// @ts-nocheck This is basically plain JS from another lib
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromRawHeaders = fromRawHeaders;
/* From https://github.com/lquixada/node-fetch/blob/master/src/headers.js */
/* License:
The MIT License (MIT)

Copyright (c) 2016 - 2020 Node Fetch Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
const utils_1 = require("../utils");
const validateHeaderName = (name) => {
    if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
    }
};
const validateHeaderValue = (name, value) => {
    if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
    }
};
/**
 * @typedef {Headers | Record<string, string> | Iterable<readonly [string, string]> | Iterable<Iterable<string>>} HeadersInit
 */
/**
 * This Fetch API interface allows you to perform various actions on HTTP request and response headers.
 * These actions include retrieving, setting, adding to, and removing.
 * A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs.
 * You can add to this using methods like append() (see Examples.)
 * In all methods of this interface, header names are matched by case-insensitive byte sequence.
 *
 */
class Headers extends URLSearchParams {
    /**
     * Headers class
     *
     * @constructor
     * @param {HeadersInit} [init] - Response headers
     */
    constructor(init) {
        // Validate and normalize init object in [name, value(s)][]
        /** @type {string[][]} */
        let result = [];
        if (init instanceof Headers) {
            const raw = init.raw();
            for (const [name, values] of Object.entries(raw)) {
                result.push(...values.map((value) => [name, value]));
            }
        } else if (init == null) {
            // eslint-disable-line no-eq-null, eqeqeq
            // No op
        } else if (typeof init === "object" && !(0, utils_1.isBoxedPrimitive)(init)) {
            const method = init[Symbol.iterator];
            // eslint-disable-next-line no-eq-null, eqeqeq
            if (method == null) {
                // Record<ByteString, ByteString>
                result.push(...Object.entries(init));
            } else {
                if (typeof method !== "function") {
                    throw new TypeError("Header pairs must be iterable");
                }
                // Sequence<sequence<ByteString>>
                // Note: per spec we have to first exhaust the lists then process them
                result = [...init]
                    .map((pair) => {
                        if (typeof pair !== "object" || (0, utils_1.isBoxedPrimitive)(pair)) {
                            throw new TypeError("Each header pair must be an iterable object");
                        }
                        return [...pair];
                    })
                    .map((pair) => {
                        if (pair.length !== 2) {
                            throw new TypeError("Each header pair must be a name/value tuple");
                        }
                        return [...pair];
                    });
            }
        } else {
            throw new TypeError(
                "Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)"
            );
        }
        // Validate and lowercase
        result =
            result.length > 0
                ? result.map(([name, value]) => {
                      validateHeaderName(name);
                      validateHeaderValue(name, String(value));
                      return [String(name).toLowerCase(), String(value)];
                  })
                : undefined;
        super(result);
        // Returning a Proxy that will lowercase key names, validate parameters and sort keys
        // eslint-disable-next-line no-constructor-return
        return new Proxy(this, {
            get(target, p, receiver) {
                switch (p) {
                    case "append":
                    case "set":
                        return (name, value) => {
                            validateHeaderName(name);
                            validateHeaderValue(name, String(value));
                            return URLSearchParams.prototype[p].call(
                                receiver,
                                String(name).toLowerCase(),
                                String(value)
                            );
                        };
                    case "delete":
                    case "has":
                    case "getAll":
                        return (name) => {
                            validateHeaderName(name);
                            return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                        };
                    case "keys":
                        return () => {
                            target.sort();
                            return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                        };
                    default:
                        return Reflect.get(target, p, receiver);
                }
            },
            /* c8 ignore next */
        });
    }
    get [Symbol.toStringTag]() {
        return this.constructor.name;
    }
    toString() {
        return Object.prototype.toString.call(this);
    }
    get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
            return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
            value = value.toLowerCase();
        }
        return value;
    }
    forEach(callback, thisArg = undefined) {
        for (const name of this.keys()) {
            Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
    }
    *values() {
        for (const name of this.keys()) {
            yield this.get(name);
        }
    }
    /**
     * @type {() => IterableIterator<[string, string]>}
     */
    *entries() {
        for (const name of this.keys()) {
            yield [name, this.get(name)];
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    /**
     * Node-fetch non-spec method
     * returning all headers and their values as array
     * @returns {Record<string, string[]>}
     */
    raw() {
        return [...this.keys()].reduce((result, key) => {
            result[key] = this.getAll(key);
            return result;
        }, {});
    }
    /**
     * For better console.log(headers) and also to convert Headers into Node.js Request compatible format
     */
    [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
            const values = this.getAll(key);
            // Http.request() only supports string as Host header.
            // This hack makes specifying custom Host header possible.
            if (key === "host") {
                result[key] = values[0];
            } else {
                result[key] = values.length > 1 ? values : values[0];
            }
            return result;
        }, {});
    }
}
exports.default = Headers;
/**
 * Re-shaping object for Web IDL tests
 * Only need to do it for overridden methods
 */
Object.defineProperties(
    Headers.prototype,
    ["get", "entries", "forEach", "values"].reduce((result, property) => {
        result[property] = { enumerable: true };
        return result;
    }, {})
);
/**
 * Create a Headers object from an http.IncomingMessage.rawHeaders, ignoring those that do
 * not conform to HTTP grammar productions.
 * @param {import('http').IncomingMessage['rawHeaders']} headers
 */
function fromRawHeaders(headers = []) {
    return new Headers(
        headers
            // Split into pairs
            .reduce((result, value, index, array) => {
                if (index % 2 === 0) {
                    result.push(array.slice(index, index + 2));
                }
                return result;
            }, [])
            .filter(([name, value]) => {
                try {
                    validateHeaderName(name);
                    validateHeaderValue(name, String(value));
                    return true;
                } catch (_a) {
                    return false;
                }
            })
    );
}
