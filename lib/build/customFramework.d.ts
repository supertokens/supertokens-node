// @ts-nocheck
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
import { CollectingResponse, PreParsedRequest } from "./framework/custom";
import { SessionContainer, VerifySessionOptions } from "./recipe/session";
import { JWTPayload } from "jose";
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
export declare function getSessionDetails(
    preParsedRequest: PreParsedRequest,
    options?: VerifySessionOptions,
    userContext?: Record<string, unknown>
): Promise<{
    session: SessionContainer | undefined;
    hasToken: boolean;
    hasInvalidClaims: boolean;
    baseResponse: CollectingResponse;
    response?: Response;
}>;
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
export declare function withSession<
    RequestType extends ParsableRequest = Request,
    ResponseType extends Response = Response
>(
    request: RequestType,
    handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<ResponseType>,
    options?: VerifySessionOptions,
    userContext?: Record<string, any>,
    getCookieFn?: GetCookieFn<RequestType>
): Promise<ResponseType>;
export declare function addCookies<UserResponseType extends Response = Response>(
    baseResponse: CollectingResponse,
    userResponse: UserResponseType
): UserResponseType;
export declare function handleError<UserResponseType extends Response = Response>(
    err: any,
    baseRequest: PreParsedRequest,
    baseResponse: CollectingResponse
): Promise<UserResponseType>;
