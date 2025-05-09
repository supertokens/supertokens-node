/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */

import { serialize } from "cookie";
import { CollectingResponse, errorHandler, middleware, PreParsedRequest } from "./framework/custom";
import Session, { SessionContainer, VerifySessionOptions } from "./recipe/session";
import SessionRecipe from "./recipe/session/recipe";
import { parseJWTWithoutSignatureVerification } from "./recipe/session/jwt";
import { JWTPayload } from "jose";
import { HTTPMethod } from "./types";
import { getInfoFromAccessToken } from "./recipe/session/accessToken";
import { getCombinedJWKS } from "./combinedRemoteJWKSet";
import { BaseRequest } from "./framework";

export interface ParsableRequest {
    url: string;
    method: string;
    headers: Headers;
    formData: () => Promise<FormData>;
    json: () => Promise<any>;
}

function createPreParsedRequest<RequestType extends ParsableRequest = Request>(request: RequestType): PreParsedRequest {
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

export function getCookieFromRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Record<string, string> {
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

export function getQueryFromRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Record<string, string> {
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

function getAccessToken<RequestType extends ParsableRequest = Request>(request: RequestType): string | undefined {
    return getCookieFromRequest(request)["sAccessToken"];
}

function getHandleCall<RequestType extends ParsableRequest = Request>(stMiddleware: any) {
    return async function handleCall(req: RequestType) {
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

export function handleAuthAPIRequest() {
    /**
     * Util function to handle all calls by intercepting them, calling
     * Supertokens middleware and then accordingly returning.
     */
    const stMiddleware = middleware<BaseRequest>((req) => {
        return req;
    });

    return getHandleCall<Request>(stMiddleware);
}

/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
export async function getSessionForSSR<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}> {
    return getSessionForSSRUsingAccessToken(getAccessToken(request));
}

export async function getSessionForSSRUsingAccessToken(accessToken: string | undefined): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}> {
    const hasToken = !!accessToken;
    try {
        const sessionRecipe = SessionRecipe.getInstanceOrThrowError();
        const jwksToUse = getCombinedJWKS(sessionRecipe.config);

        try {
            if (accessToken) {
                const tokenInfo = parseJWTWithoutSignatureVerification(accessToken);
                const decoded = await getInfoFromAccessToken(tokenInfo, jwksToUse, false);
                return { accessTokenPayload: decoded.userData, hasToken, error: undefined };
            }
            return { accessTokenPayload: undefined, hasToken, error: undefined };
        } catch (error) {
            return { accessTokenPayload: undefined, hasToken, error: undefined };
        }
    } catch (error) {
        return { accessTokenPayload: undefined, hasToken, error: error as Error };
    }
}

export async function withSession<
    RequestType extends ParsableRequest = Request,
    ResponseType extends Response = Response
>(
    request: RequestType,
    handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<ResponseType>,
    options?: VerifySessionOptions,
    userContext?: Record<string, any>
): Promise<ResponseType> {
    try {
        return await withPreParsedRequestResponse(request, async (baseRequest, baseResponse) => {
            const session = await Session.getSession(baseRequest, baseResponse, options, userContext);
            return handler(undefined, session);
        });
    } catch (error) {
        return await handler(error as Error, undefined);
    }
}

export async function withPreParsedRequestResponse<
    RequestType extends ParsableRequest = Request,
    ResponseType extends Response = Response
>(
    req: RequestType,
    handler: (baseRequest: PreParsedRequest, baseResponse: CollectingResponse) => Promise<ResponseType>
): Promise<ResponseType> {
    let baseRequest = createPreParsedRequest<RequestType>(req);
    let baseResponse = new CollectingResponse();
    let userResponse: ResponseType;

    try {
        userResponse = await handler(baseRequest, baseResponse);
    } catch (err) {
        userResponse = await handleError<ResponseType>(err, baseRequest, baseResponse);
    }

    return addCookies<ResponseType>(baseResponse, userResponse);
}

function addCookies<UserResponseType extends Response = Response>(
    baseResponse: CollectingResponse,
    userResponse: UserResponseType
): UserResponseType {
    /**
     * Add cookies to the userResponse passed by copying it from the baseResponse.
     */
    let didAddCookies = false;
    let didAddHeaders = false;

    for (const respCookie of baseResponse.cookies) {
        didAddCookies = true;
        userResponse.headers.append(
            "Set-Cookie",
            serialize(respCookie.key, respCookie.value, {
                domain: respCookie.domain,
                expires: new Date(respCookie.expires),
                httpOnly: respCookie.httpOnly,
                path: respCookie.path,
                sameSite: respCookie.sameSite,
                secure: respCookie.secure,
            })
        );
    }

    baseResponse.headers.forEach((value: string, key: string) => {
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

async function handleError<UserResponseType extends Response = Response>(
    err: any,
    baseRequest: PreParsedRequest,
    baseResponse: CollectingResponse
): Promise<UserResponseType> {
    await errorHandler()(err, baseRequest, baseResponse, (errorHandlerError: Error) => {
        if (errorHandlerError) {
            throw errorHandlerError;
        }
    });

    // The headers in the userResponse are set twice from baseResponse, but the resulting response contains unique headers.
    return new Response(baseResponse.body, {
        status: baseResponse.statusCode,
        headers: baseResponse.headers,
    }) as UserResponseType;
}
