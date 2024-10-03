// @ts-nocheck
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
import { PreParsedRequest } from "./framework/custom";
import { SessionContainer, VerifySessionOptions } from "./recipe/session";
import { JWTPayload } from "jose";
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
export declare type GetCookieFn<T extends ParsableRequest = Request> = (req: T) => Record<string, string>;
export interface ParsableRequest {
    url: string;
    method: string;
    headers: Headers;
    formData: () => Promise<FormData>;
    json: () => Promise<any>;
}
export declare function createPreParsedRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType,
    getCookieFn?: GetCookieFn<RequestType>
): PreParsedRequest;
export declare function getCookieFromRequest(request: ParsableRequest): Record<string, string>;
export declare function getQueryFromRequest(request: ParsableRequest): Record<string, string>;
export declare function getHandleCall<T = Request>(
    res: typeof Response,
    stMiddleware: any
): (req: T) => Promise<Response>;
export declare function handleAuthAPIRequest(CustomResponse: typeof Response): (req: Request) => Promise<Response>;
/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
export declare function getSessionForSSR(
    request: Request,
    jwks?: any
): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}>;
export declare function withSession(
    request: Request,
    handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<Response>,
    options?: VerifySessionOptions,
    userContext?: Record<string, any>
): Promise<Response>;
