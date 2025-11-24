// @ts-nocheck
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
import { CollectingResponse, PreParsedRequest } from "./framework/custom";
import { SessionContainer, VerifySessionOptions } from "./recipe/session";
import { JWTPayload } from "jose";
export interface ParsableRequest {
    url: string;
    method: string;
    headers: Headers;
    formData: () => Promise<FormData>;
    json: () => Promise<any>;
}
export declare function getCookieFromRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Record<string, string>;
export declare function getQueryFromRequest<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Record<string, string>;
export declare function handleAuthAPIRequest(): (req: Request) => Promise<Response>;
/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
export declare function getSessionForSSR<RequestType extends ParsableRequest = Request>(
    request: RequestType
): Promise<{
    accessTokenPayload: JWTPayload | undefined;
    hasToken: boolean;
    error: Error | undefined;
}>;
export declare function getSessionForSSRUsingAccessToken(accessToken: string | undefined): Promise<{
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
    userContext?: Record<string, any>
): Promise<ResponseType>;
export declare function withPreParsedRequestResponse<
    RequestType extends ParsableRequest = Request,
    ResponseType extends Response = Response
>(
    req: RequestType,
    handler: (baseRequest: PreParsedRequest, baseResponse: CollectingResponse) => Promise<ResponseType>
): Promise<ResponseType>;
