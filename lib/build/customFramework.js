"use strict";
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreParsedRequest = void 0;
const custom_1 = require("./framework/custom");
function createPreParsedRequest(request) {
    /**
     * This helper function can take any `Request` type of object
     * and parse the details into an equivalent PreParsedRequest
     * that can be used with the custom framework helpers.
     */
    return new custom_1.PreParsedRequest({
        cookies: getCookieFromRequest(request),
        url: request.url,
        method: request.method,
        query: getQueryFromRequest(request),
        headers: request.headers,
        getFormBody: async () => {
            return await request.formData();
        },
        getJSONBody: async () => {
            return await request.json();
        },
    });
}
exports.createPreParsedRequest = createPreParsedRequest;
function getCookieFromRequest(request) {
    /**
     * This function will extract the cookies from any `Request`
     * type of object and return them to be usable with PreParsedRequest.
     */
    const cookies = {};
    const cookieHeader = request.headers.get("Cookie");
    if (cookieHeader) {
        const cookieStrings = cookieHeader.split(";");
        for (const cookieString of cookieStrings) {
            const [name, value] = cookieString.trim().split("=");
            cookies[name] = decodeURIComponent(value);
        }
    }
    return cookies;
}
function getQueryFromRequest(request) {
    /**
     * Helper function to extract query from any `Request` type of
     * object and return them to be usable with PreParsedRequest.
     */
    const query = {};
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    searchParams.forEach((value, key) => {
        query[key] = value;
    });
    return query;
}
