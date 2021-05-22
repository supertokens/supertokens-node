/// <reference types="node" />
import * as express from "express";
import { IncomingMessage, ServerResponse } from "http";
import { TypeNormalisedInput } from "./types";
/**
 * @description clears all the auth cookies from the response
 */
export declare function clearSessionFromCookie(config: TypeNormalisedInput, res: express.Response): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachAccessTokenToCookie(
    config: TypeNormalisedInput,
    res: express.Response,
    token: string,
    expiry: number
): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachRefreshTokenToCookie(
    config: TypeNormalisedInput,
    res: express.Response,
    token: string,
    expiry: number
): void;
export declare function getAccessTokenFromCookie(req: express.Request): string | undefined;
export declare function getRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function getAntiCsrfTokenFromHeaders(req: express.Request): string | undefined;
export declare function getRidFromHeader(req: express.Request): string | undefined;
export declare function getIdRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: express.Response, antiCsrfToken: string): void;
export declare function setIdRefreshTokenInHeaderAndCookie(
    config: TypeNormalisedInput,
    res: express.Response,
    idRefreshToken: string,
    expiry: number
): void;
export declare function setFrontTokenInHeaders(
    res: express.Response,
    userId: string,
    atExpiry: number,
    jwtPayload: any
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
    res: ServerResponse,
    name: string,
    value: string,
    expires: number,
    pathType: "refreshTokenPath" | "accessTokenPath"
): ServerResponse;
export declare function getCookieValue(req: IncomingMessage, key: string): string | undefined;
