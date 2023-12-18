// @ts-nocheck
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
export default class Headers extends URLSearchParams {
    /**
     * Headers class
     *
     * @constructor
     * @param {HeadersInit} [init] - Response headers
     */
    constructor(init: any);
    get [Symbol.toStringTag](): string;
    toString(): string;
    get(name: any): string | null;
    forEach(callback: any, thisArg?: undefined): void;
    values(): Generator<string | null, void, unknown>;
    /**
     * @type {() => IterableIterator<[string, string]>}
     */
    entries(): Generator<(string | null)[], void, unknown>;
    [Symbol.iterator](): Generator<(string | null)[], void, unknown>;
    /**
     * Node-fetch non-spec method
     * returning all headers and their values as array
     * @returns {Record<string, string[]>}
     */
    raw(): {};
}
/**
 * Create a Headers object from an http.IncomingMessage.rawHeaders, ignoring those that do
 * not conform to HTTP grammar productions.
 * @param {import('http').IncomingMessage['rawHeaders']} headers
 */
export declare function fromRawHeaders(headers?: never[]): Headers;
