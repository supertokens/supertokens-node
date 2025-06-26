"use strict";
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieFromRequest = getCookieFromRequest;
exports.getQueryFromRequest = getQueryFromRequest;
exports.handleAuthAPIRequest = handleAuthAPIRequest;
exports.getSessionForSSR = getSessionForSSR;
exports.getSessionForSSRUsingAccessToken = getSessionForSSRUsingAccessToken;
exports.withSession = withSession;
exports.withPreParsedRequestResponse = withPreParsedRequestResponse;
const cookie_1 = require("cookie");
const custom_1 = require("./framework/custom");
const session_1 = __importDefault(require("./recipe/session"));
const recipe_1 = __importDefault(require("./recipe/session/recipe"));
const jwt_1 = require("./recipe/session/jwt");
const accessToken_1 = require("./recipe/session/accessToken");
const combinedRemoteJWKSet_1 = require("./combinedRemoteJWKSet");
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
function getAccessToken(request) {
    return getCookieFromRequest(request)["sAccessToken"];
}
function getHandleCall(stMiddleware) {
    return async function handleCall(req) {
        return withPreParsedRequestResponse(req, async (baseRequest, baseResponse) => {
            const { handled, error } = await stMiddleware(baseRequest, baseResponse);
            if (error) {
                throw error;
            }
            if (!handled) {
                return new Response("Not found", { status: 404 });
            }
            return new Response(baseResponse.body, {
                headers: baseResponse.headers,
                status: baseResponse.statusCode,
            });
        });
    };
}
function handleAuthAPIRequest() {
    /**
     * Util function to handle all calls by intercepting them, calling
     * Supertokens middleware and then accordingly returning.
     */
    const stMiddleware = (0, custom_1.middleware)((req) => {
        return req;
    });
    return getHandleCall(stMiddleware);
}
/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
async function getSessionForSSR(request) {
    return getSessionForSSRUsingAccessToken(getAccessToken(request));
}
async function getSessionForSSRUsingAccessToken(accessToken) {
    const hasToken = !!accessToken;
    try {
        const sessionRecipe = recipe_1.default.getInstanceOrThrowError();
        const jwksToUse = (0, combinedRemoteJWKSet_1.getCombinedJWKS)(sessionRecipe.config);
        try {
            if (accessToken) {
                const tokenInfo = (0, jwt_1.parseJWTWithoutSignatureVerification)(accessToken);
                const decoded = await (0, accessToken_1.getInfoFromAccessToken)(tokenInfo, jwksToUse, false);
                return { accessTokenPayload: decoded.userData, hasToken, error: undefined };
            }
            return { accessTokenPayload: undefined, hasToken, error: undefined };
        } catch (error) {
            return { accessTokenPayload: undefined, hasToken, error: undefined };
        }
    } catch (error) {
        return { accessTokenPayload: undefined, hasToken, error: error };
    }
}
async function withSession(request, handler, options, userContext) {
    try {
        return await withPreParsedRequestResponse(request, async (baseRequest, baseResponse) => {
            const session = await session_1.default.getSession(baseRequest, baseResponse, options, userContext);
            return handler(undefined, session);
        });
    } catch (error) {
        return await handler(error, undefined);
    }
}
async function withPreParsedRequestResponse(req, handler) {
    let baseRequest = createPreParsedRequest(req);
    let baseResponse = new custom_1.CollectingResponse();
    let userResponse;
    try {
        userResponse = await handler(baseRequest, baseResponse);
    } catch (err) {
        userResponse = await handleError(err, baseRequest, baseResponse);
    }
    return addCookies(baseResponse, userResponse);
}
function addCookies(baseResponse, userResponse) {
    /**
     * Add cookies to the userResponse passed by copying it from the baseResponse.
     */
    let didAddCookies = false;
    let didAddHeaders = false;
    for (const respCookie of baseResponse.cookies) {
        didAddCookies = true;
        userResponse.headers.append(
            "Set-Cookie",
            (0, cookie_1.serialize)(respCookie.key, respCookie.value, {
                domain: respCookie.domain,
                expires: new Date(respCookie.expires),
                httpOnly: respCookie.httpOnly,
                path: respCookie.path,
                sameSite: respCookie.sameSite,
                secure: respCookie.secure,
            })
        );
    }
    baseResponse.headers.forEach((value, key) => {
        didAddHeaders = true;
        userResponse.headers.set(key, value);
    });
    /**
     * For some deployment services (Vercel for example) production builds can return cached results for
     * APIs with older header values. In this case if the session tokens have changed (because of refreshing
     * for example) the cached result would still contain the older tokens and sessions would stop working.
     *
     * As a result, if we add cookies or headers from base response we also set the Cache-Control header
     * to make sure that the final result is not a cached version.
     */
    if (didAddCookies || didAddHeaders) {
        if (!userResponse.headers.has("Cache-Control")) {
            // This is needed for production deployments with Vercel
            userResponse.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
        }
    }
    return userResponse;
}
async function handleError(err, baseRequest, baseResponse) {
    await (0, custom_1.errorHandler)()(err, baseRequest, baseResponse, (errorHandlerError) => {
        if (errorHandlerError) {
            throw errorHandlerError;
        }
    });
    // The headers in the userResponse are set twice from baseResponse, but the resulting response contains unique headers.
    return new Response(baseResponse.body, {
        status: baseResponse.statusCode,
        headers: baseResponse.headers,
    });
}
