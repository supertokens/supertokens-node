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
import { jwtVerify, JWTPayload } from "jose";

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

function getAccessToken(request: Request): string | undefined {
    return getCookieFromRequest(request)["sAccessToken"];
}

async function verifyToken(token: string, jwks: any): Promise<JWTPayload> {
    // Verify the JWT using the remote JWK set and return the payload
    const { payload } = await jwtVerify(token, jwks);
    return payload;
}

export function handleAuthAPIRequest(CustomResponse: typeof Response) {
    /**
     * Util function to handle all calls by intercepting them, calling
     * Supertokens middleware and then accordingly returning.
     */
    const stMiddleware = middleware<Request>((req) => {
        return createPreParsedRequest(req);
    });

    return async function handleCall(req: Request) {
        const baseResponse = new CollectingResponse();

        const { handled, error } = await stMiddleware(req, baseResponse);

        if (error) {
            throw error;
        }
        if (!handled) {
            return new CustomResponse("Not found", { status: 404 });
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

        return new CustomResponse(baseResponse.body, {
            headers: baseResponse.headers,
            status: baseResponse.statusCode,
        });
    };
}

async function getSessionDetails(
    preParsedRequest: PreParsedRequest,
    options?: VerifySessionOptions,
    userContext?: Record<string, unknown>
): Promise<{
    session: SessionContainer | undefined;
    hasToken: boolean;
    hasInvalidClaims: boolean;
    baseResponse: CollectingResponse;
    RemixResponse?: Response;
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
                RemixResponse: new Response("Authentication required", {
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
    jwks: any
): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}> {
    const accessToken = getAccessToken(request);
    const hasToken = !!accessToken;
    try {
        if (accessToken) {
            const decoded = await verifyToken(accessToken, jwks);
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
    remixRequest: Request,
    handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<Response>,
    options?: VerifySessionOptions,
    userContext?: Record<string, any>
): Promise<Response> {
    try {
        const baseRequest = createPreParsedRequest(remixRequest);
        const { session, RemixResponse, baseResponse } = await getSessionDetails(baseRequest, options, userContext);

        if (RemixResponse !== undefined) {
            return RemixResponse;
        }

        let userResponse: Response;

        try {
            userResponse = await handler(undefined, session);
        } catch (err) {
            await errorHandler()(err, baseRequest, baseResponse, (errorHandlerError: Error) => {
                if (errorHandlerError) {
                    throw errorHandlerError;
                }
            });

            // The headers in the userResponse are set twice from baseResponse, but the resulting response contains unique headers.
            userResponse = new Response(baseResponse.body, {
                status: baseResponse.statusCode,
                headers: baseResponse.headers,
            });
        }

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
        if (didAddCookies || didAddHeaders) {
            if (!userResponse.headers.has("Cache-Control")) {
                // This is needed for production deployments with Vercel
                userResponse.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            }
        }

        return userResponse;
    } catch (error) {
        return await handler(error as Error, undefined);
    }
}
