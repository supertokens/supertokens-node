// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { UserContext } from "../../types";
import { TokenTransferMethod, TokenType, TypeNormalisedInput } from "./types";
export declare function clearSessionFromAllTokenTransferMethods(
    config: TypeNormalisedInput,
    res: BaseResponse,
    request: BaseRequest,
    userContext: UserContext
): void;
export declare function clearSession(
    config: TypeNormalisedInput,
    res: BaseResponse,
    transferMethod: TokenTransferMethod,
    request: BaseRequest,
    userContext: UserContext
): void;
export declare function getAntiCsrfTokenFromHeaders(req: BaseRequest): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: BaseResponse, antiCsrfToken: string): void;
export declare function buildFrontToken(userId: string, atExpiry: number, accessTokenPayload: any): string;
export declare function setFrontTokenInHeaders(res: BaseResponse, frontToken: string): void;
export declare function getCORSAllowedHeaders(): string[];
export declare function getToken(
    config: TypeNormalisedInput,
    req: BaseRequest,
    tokenType: TokenType,
    transferMethod: TokenTransferMethod,
    userContext: UserContext
): string | undefined;
export declare function setToken(
    config: TypeNormalisedInput,
    res: BaseResponse,
    tokenType: TokenType,
    value: string,
    expires: number,
    transferMethod: TokenTransferMethod,
    req: BaseRequest,
    userContext: UserContext
): void;
export declare function setHeader(res: BaseResponse, name: string, value: string): void;
/**
 *
 * @param res
 * @param name
 * @param value
 * @param domain
 * @param secure
 * @param httpOnly
 * @param expires
 * @param path
 */
export declare function setCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    name: string,
    value: string,
    expires: number,
    pathType: "refreshTokenPath" | "accessTokenPath",
    req: BaseRequest | undefined,
    userContext: UserContext
): void;
export declare function getAuthModeFromHeader(req: BaseRequest): string | undefined;
/**
 *  This function addresses an edge case where changing the cookieDomain config on the server can
 *  lead to session integrity issues. For instance, if the API server URL is 'api.example.com'
 *  with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com',
 *  the client may retain cookies with both '.example.com' and 'api.example.com' domains.
 *
 *  Consequently, if the server chooses the older cookie, session invalidation occurs, potentially
 *  resulting in an infinite refresh loop. To fix this, users are asked to specify "olderCookieDomain" in
 *  the config.
 *
 * This function checks for multiple cookies with the same name and clears the cookies for the older domain
 */
export declare function clearSessionCookiesFromOlderCookieDomain({
    req,
    res,
    config,
    userContext,
}: {
    req: BaseRequest;
    res: BaseResponse;
    config: TypeNormalisedInput;
    userContext: UserContext;
}): void;
export declare function hasMultipleCookiesForTokenType(
    config: TypeNormalisedInput,
    req: BaseRequest,
    tokenType: TokenType,
    userContext: UserContext
): boolean;
