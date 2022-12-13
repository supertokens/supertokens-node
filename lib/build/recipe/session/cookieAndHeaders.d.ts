// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import { TokenTransferMethod, TokenType, TypeNormalisedInput } from "./types";
export declare function clearSessionFromAllTokenTransferMethods(
    config: TypeNormalisedInput,
    req: BaseRequest,
    res: BaseResponse
): void;
export declare function clearSession(
    config: TypeNormalisedInput,
    res: BaseResponse,
    transferMethod: TokenTransferMethod
): void;
export declare function getAntiCsrfTokenFromHeaders(req: BaseRequest): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: BaseResponse, antiCsrfToken: string): void;
export declare function setFrontTokenInHeaders(
    res: BaseResponse,
    userId: string,
    atExpiry: number,
    accessTokenPayload: any
): void;
export declare function getCORSAllowedHeaders(): string[];
export declare function getToken(
    req: BaseRequest,
    tokenType: TokenType,
    transferMethod: TokenTransferMethod
): string | undefined;
export declare function setToken(
    config: TypeNormalisedInput,
    res: BaseResponse,
    tokenType: TokenType,
    value: string,
    expires: number,
    transferMethod: TokenTransferMethod
): void;
export declare function setHeader(res: BaseResponse, name: string, value: string, expires: number): void;
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
    pathType: "refreshTokenPath" | "accessTokenPath"
): void;
export declare function getAuthModeFromHeader(req: BaseRequest): string | undefined;
