// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import { TypeNormalisedInput } from "./types";
/**
 * @description clears all the auth cookies from the response
 */
export declare function clearSessionFromCookie(config: TypeNormalisedInput, res: BaseResponse): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachAccessTokenToCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    token: string,
    expiry: number
): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachRefreshTokenToCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    token: string,
    expiry: number
): void;
export declare function getAccessTokenFromCookie(req: BaseRequest): string | undefined;
export declare function getRefreshTokenFromCookie(req: BaseRequest): string | undefined;
export declare function getAntiCsrfTokenFromHeaders(req: BaseRequest): string | undefined;
export declare function getRidFromHeader(req: BaseRequest): string | undefined;
export declare function getIdRefreshTokenFromCookie(req: BaseRequest): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: BaseResponse, antiCsrfToken: string): void;
export declare function setIdRefreshTokenInHeaderAndCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    idRefreshToken: string,
    expiry: number
): void;
export declare function setFrontTokenInHeaders(
    res: BaseResponse,
    userId: string,
    atExpiry: number,
    accessTokenPayload: any
): void;
export declare function getCORSAllowedHeaders(): string[];
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
