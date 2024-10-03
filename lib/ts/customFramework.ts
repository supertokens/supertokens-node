/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */

import { serialize } from "cookie";
import { CollectingResponse, errorHandler, middleware, PreParsedRequest } from "./framework/custom";
import Session, { SessionContainer, VerifySessionOptions } from "./recipe/session";
import SessionRecipe from "./recipe/session/recipe";
import { availableTokenTransferMethods } from "./recipe/session/constants";
import { getToken } from "./recipe/session/cookieAndHeaders";
import { parseJWTWithoutSignatureVerification } from "./recipe/session/jwt";
import { jwtVerify, JWTPayload, createRemoteJWKSet } from "jose";
import SuperTokens from "./supertokens";
import { HTTPMethod } from "./types";

export type GetCookieFn<T extends ParsableRequest = Request> = (req: T) => Record<string, string>;

export interface ParsableRequest {
    url: string;
    method: string;
    headers: Headers;
    formData: () => Promise<FormData>;
    json: () => Promise<any>;
}

export function createPreParsedRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType,
    getCookieFn: GetCookieFn<RequestType> = getCookieFromRequest
): PreParsedRequest {
    /**
     * This helper function can take any `Request` type of object
     * and parse the details into an equivalent PreParsedRequest
     * that can be used with the custom framework helpers.
     */
    return new PreParsedRequest({
        cookies: getCookieFn(request),
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

export function getCookieFromRequest(request: ParsableRequest): Record<string, string> {
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

export function getQueryFromRequest(request: ParsableRequest): Record<string, string> {
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

function getAccessToken(request: Request): string | undefined {
    return getCookieFromRequest(request)["sAccessToken"];
}

async function verifyToken(token: string, jwks: any): Promise<JWTPayload> {
    // Verify the JWT using the remote JWK set and return the payload
    const { payload } = await jwtVerify(token, jwks);
    return payload;
}

export function getHandleCall<T = Request>(res: typeof Response, stMiddleware: any) {
    return async function handleCall(req: T) {
        const baseResponse = new CollectingResponse();

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

        return new res(baseResponse.body, {
            headers: baseResponse.headers,
            status: baseResponse.statusCode,
        });
    };
}

export function handleAuthAPIRequest(CustomResponse: typeof Response) {
    /**
     * Util function to handle all calls by intercepting them, calling
     * Supertokens middleware and then accordingly returning.
     */
    const stMiddleware = middleware<Request>((req) => {
        return createPreParsedRequest(req);
    });

    return getHandleCall<Request>(CustomResponse, stMiddleware);
}

export async function getSessionDetails(
    preParsedRequest: PreParsedRequest,
    options?: VerifySessionOptions,
    userContext?: Record<string, unknown>
): Promise<{
    session: SessionContainer | undefined;
    hasToken: boolean;
    hasInvalidClaims: boolean;
    baseResponse: CollectingResponse;
    response?: Response;
}> {
    const baseResponse = new CollectingResponse();
    // Possible interop issue.
    const recipe = SessionRecipe.getInstanceOrThrowError();
    const tokenTransferMethod = recipe.config.getTokenTransferMethod({
        req: preParsedRequest,
        forCreateNewSession: false,
        userContext: userContext as any,
    });
    const transferMethods = tokenTransferMethod === "any" ? availableTokenTransferMethods : [tokenTransferMethod];
    const hasToken = transferMethods.some((transferMethod) => {
        const token = getToken(preParsedRequest, "access", transferMethod);
        if (!token) {
            return false;
        }
        try {
            parseJWTWithoutSignatureVerification(token);
            return true;
        } catch {
            return false;
        }
    });

    try {
        const session = await Session.getSession(preParsedRequest, baseResponse, options, userContext);
        return {
            session,
            hasInvalidClaims: false,
            hasToken,
            baseResponse,
        };
    } catch (err) {
        if (Session.Error.isErrorFromSuperTokens(err)) {
            return {
                hasToken,
                hasInvalidClaims: err.type === Session.Error.INVALID_CLAIMS,
                session: undefined,
                baseResponse,
                response: new Response("Authentication required", {
                    status: err.type === Session.Error.INVALID_CLAIMS ? 403 : 401,
                }),
            };
        } else {
            throw err;
        }
    }
}

/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
export async function getSessionForSSR(
    request: Request,
    jwks?: any
): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}> {
    const accessToken = getAccessToken(request);
    const hasToken = !!accessToken;

    let jwksToUse = jwks;
    if (!jwks) {
        const stInstance = SuperTokens.getInstanceOrThrowError();
        jwksToUse = createRemoteJWKSet(
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
        return { accessTokenPayload: undefined, hasToken, error: error as Error };
    }
}

export async function withSession(
    request: Request,
    handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<Response>,
    options?: VerifySessionOptions,
    userContext?: Record<string, any>
): Promise<Response> {
    try {
        const baseRequest = createPreParsedRequest(request);
        const { session, response, baseResponse } = await getSessionDetails(baseRequest, options, userContext);

        if (response !== undefined) {
            return response;
        }

        let userResponse: Response;

        try {
            userResponse = await handler(undefined, session);
        } catch (err) {
            userResponse = await handleError<Response>(err, baseRequest, baseResponse);
        }

        return addCookies(baseResponse, userResponse);
    } catch (error) {
        return await handler(error as Error, undefined);
    }
}

export function addCookies<UserResponseType extends Response = Response>(
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

export async function handleError<UserResponseType extends Response = Response>(
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
