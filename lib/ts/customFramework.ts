/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */

import { PreParsedRequest } from "./framework/custom";

// Define supported types for HTTPMethod
export type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";

export function createPreParsedRequest(request: Request): PreParsedRequest {
    /**
     * This helper function can take any `Request` type of object
     * and parse the details into an equivalent PreParsedRequest
     * that can be used with the custom framework helpers.
     */
    return new PreParsedRequest({
        cookies: getCookieFromRequest(request),
        url: request.url as string,
        method: request.method as HTTPMethod,
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

function getCookieFromRequest(request: Request): Record<string, string> {
    /**
     * This function will extract the cookies from any `Request`
     * type of object and return them to be usable with PreParsedRequest.
     */
    const cookies: Record<string, string> = {};
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

function getQueryFromRequest(request: Request): Record<string, string> {
    /**
     * Helper function to extract query from any `Request` type of
     * object and return them to be usable with PreParsedRequest.
     */
    const query: Record<string, string> = {};
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    searchParams.forEach((value, key) => {
        query[key] = value;
    });
    return query;
}
