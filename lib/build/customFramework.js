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
exports.handleError = exports.addCookies = exports.withSession = exports.getSessionForSSR = exports.getSessionDetails = exports.handleAuthAPIRequest = exports.getHandleCall = exports.getQueryFromRequest = exports.getCookieFromRequest = exports.createPreParsedRequest = void 0;
const cookie_1 = require("cookie");
const custom_1 = require("./framework/custom");
const session_1 = __importDefault(require("./recipe/session"));
const recipe_1 = __importDefault(require("./recipe/session/recipe"));
const constants_1 = require("./recipe/session/constants");
const cookieAndHeaders_1 = require("./recipe/session/cookieAndHeaders");
const jwt_1 = require("./recipe/session/jwt");
const jose_1 = require("jose");
const supertokens_1 = __importDefault(require("./supertokens"));
function createPreParsedRequest(request, getCookieFn = getCookieFromRequest) {
    /**
     * This helper function can take any `Request` type of object
     * and parse the details into an equivalent PreParsedRequest
     * that can be used with the custom framework helpers.
     */
    return new custom_1.PreParsedRequest({
        cookies: getCookieFn(request),
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
exports.getCookieFromRequest = getCookieFromRequest;
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
exports.getQueryFromRequest = getQueryFromRequest;
function getAccessToken(request) {
    return getCookieFromRequest(request)["sAccessToken"];
}
async function verifyToken(token, jwks) {
    // Verify the JWT using the remote JWK set and return the payload
    const { payload } = await jose_1.jwtVerify(token, jwks);
    return payload;
}
function getHandleCall(res, stMiddleware) {
    return async function handleCall(req) {
        const baseResponse = new custom_1.CollectingResponse();
        const { handled, error } = await stMiddleware(req, baseResponse);
        if (error) {
            throw error;
        }
        if (!handled) {
            return new res("Not found", { status: 404 });
        }
        for (const respCookie of baseResponse.cookies) {
            baseResponse.headers.append(
                "Set-Cookie",
                cookie_1.serialize(respCookie.key, respCookie.value, {
                    domain: respCookie.domain,
                    expires: new Date(respCookie.expires),
                    httpOnly: respCookie.httpOnly,
                    path: respCookie.path,
                    sameSite: respCookie.sameSite,
                    secure: respCookie.secure,
                })
            );
        }
        return new res(baseResponse.body, {
            headers: baseResponse.headers,
            status: baseResponse.statusCode,
        });
    };
}
exports.getHandleCall = getHandleCall;
function handleAuthAPIRequest(CustomResponse) {
    /**
     * Util function to handle all calls by intercepting them, calling
     * Supertokens middleware and then accordingly returning.
     */
    const stMiddleware = custom_1.middleware((req) => {
        return createPreParsedRequest(req);
    });
    return getHandleCall(CustomResponse, stMiddleware);
}
exports.handleAuthAPIRequest = handleAuthAPIRequest;
async function getSessionDetails(preParsedRequest, options, userContext) {
    const baseResponse = new custom_1.CollectingResponse();
    // Possible interop issue.
    const recipe = recipe_1.default.getInstanceOrThrowError();
    const tokenTransferMethod = recipe.config.getTokenTransferMethod({
        req: preParsedRequest,
        forCreateNewSession: false,
        userContext: userContext,
    });
    const transferMethods =
        tokenTransferMethod === "any" ? constants_1.availableTokenTransferMethods : [tokenTransferMethod];
    const hasToken = transferMethods.some((transferMethod) => {
        const token = cookieAndHeaders_1.getToken(preParsedRequest, "access", transferMethod);
        if (!token) {
            return false;
        }
        try {
            jwt_1.parseJWTWithoutSignatureVerification(token);
            return true;
        } catch (_a) {
            return false;
        }
    });
    try {
        const session = await session_1.default.getSession(preParsedRequest, baseResponse, options, userContext);
        return {
            session,
            hasInvalidClaims: false,
            hasToken,
            baseResponse,
        };
    } catch (err) {
        if (session_1.default.Error.isErrorFromSuperTokens(err)) {
            return {
                hasToken,
                hasInvalidClaims: err.type === session_1.default.Error.INVALID_CLAIMS,
                session: undefined,
                baseResponse,
                response: new Response("Authentication required", {
                    status: err.type === session_1.default.Error.INVALID_CLAIMS ? 403 : 401,
                }),
            };
        } else {
            throw err;
        }
    }
}
exports.getSessionDetails = getSessionDetails;
/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
async function getSessionForSSR(request, jwks) {
    const accessToken = getAccessToken(request);
    const hasToken = !!accessToken;
    let jwksToUse = jwks;
    if (!jwks) {
        const stInstance = supertokens_1.default.getInstanceOrThrowError();
        jwksToUse = jose_1.createRemoteJWKSet(
            new URL(
                `${stInstance.appInfo.apiDomain.getAsStringDangerous()}${stInstance.appInfo.apiBasePath.getAsStringDangerous()}/jwt/jwks.json`
            )
        );
    }
    try {
        if (accessToken) {
            const decoded = await verifyToken(accessToken, jwksToUse);
            return { accessTokenPayload: decoded, hasToken, error: undefined };
        }
        return { accessTokenPayload: undefined, hasToken, error: undefined };
    } catch (error) {
        if (error instanceof Error && error.name === "JWTExpired") {
            return { accessTokenPayload: undefined, hasToken, error: undefined };
        }
        return { accessTokenPayload: undefined, hasToken, error: error };
    }
}
exports.getSessionForSSR = getSessionForSSR;
async function withSession(request, handler, options, userContext) {
    try {
        const baseRequest = createPreParsedRequest(request);
        const { session, response, baseResponse } = await getSessionDetails(baseRequest, options, userContext);
        if (response !== undefined) {
            return response;
        }
        let userResponse;
        try {
            userResponse = await handler(undefined, session);
        } catch (err) {
            userResponse = await handleError(err, baseRequest, baseResponse);
        }
        return addCookies(baseResponse, userResponse);
    } catch (error) {
        return await handler(error, undefined);
    }
}
exports.withSession = withSession;
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
            cookie_1.serialize(respCookie.key, respCookie.value, {
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
exports.addCookies = addCookies;
async function handleError(err, baseRequest, baseResponse) {
    await custom_1.errorHandler()(err, baseRequest, baseResponse, (errorHandlerError) => {
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
exports.handleError = handleError;
