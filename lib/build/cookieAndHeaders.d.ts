/// <reference types="node" />
import * as express from "express";
import { IncomingMessage, ServerResponse } from "http";
export declare class CookieConfig {
    private static instance;
    accessTokenPath: string | undefined;
    refreshTokenPath: string | undefined;
    cookieDomain: string | undefined;
    cookieSecure: boolean | undefined;
    cookieSameSite: "strict" | "lax" | "none" | undefined;
    constructor(accessTokenPath?: string, refreshTokenPath?: string, cookieDomain?: string, cookieSecure?: boolean, cookieSameSite?: "strict" | "lax" | "none");
    static init(accessTokenPath?: string, refreshTokenPath?: string, cookieDomain?: string, cookieSecure?: boolean, cookieSameSite?: "strict" | "lax" | "none"): void;
    static reset(): void;
    static getInstance(): CookieConfig;
}
export declare function saveFrontendInfoFromRequest(req: express.Request): void;
/**
 * @description clears all the auth cookies from the response
 */
export declare function clearSessionFromCookie(res: express.Response, domain: string | undefined, secure: boolean, accessTokenPath: string, refreshTokenPath: string, idRefreshTokenPath: string, sameSite: "strict" | "lax" | "none"): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachAccessTokenToCookie(res: express.Response, token: string, expiry: number, domain: string | undefined, path: string, secure: boolean, sameSite: "strict" | "lax" | "none"): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachRefreshTokenToCookie(res: express.Response, token: string, expiry: number, domain: string | undefined, path: string, secure: boolean, sameSite: "strict" | "lax" | "none"): void;
export declare function getAccessTokenFromCookie(req: express.Request): string | undefined;
export declare function getRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function getAntiCsrfTokenFromHeaders(req: express.Request): string | undefined;
export declare function getIdRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: express.Response, antiCsrfToken: string): void;
export declare function setIdRefreshTokenInHeaderAndCookie(res: express.Response, idRefreshToken: string, expiry: number, domain: string | undefined, secure: boolean, path: string, sameSite: "strict" | "lax" | "none"): void;
export declare function setFrontTokenInHeaders(res: express.Response, userId: string, atExpiry: number, jwtPayload: any): void;
export declare function getHeader(req: express.Request, key: string): string | undefined;
export declare function setOptionsAPIHeader(res: express.Response): void;
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
export declare function setCookie(res: ServerResponse, name: string, value: string, domain: string | undefined, secure: boolean, httpOnly: boolean, expires: number, path: string, sameSite: "strict" | "lax" | "none", pathType?: "refreshTokenPath" | "accessTokenPath" | null): ServerResponse;
export declare function getCookieValue(req: IncomingMessage, key: string): string | undefined;
