/// <reference types="node" />
import * as express from "express";
import { IncomingMessage, ServerResponse } from "http";
export declare function saveFrontendInfoFromRequest(req: express.Request): void;
/**
 * @description clears all the auth cookies from the response
 */
export declare function clearSessionFromCookie(res: express.Response, domain: string, secure: boolean, accessTokenPath: string, refreshTokenPath: string): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachAccessTokenToCookie(res: express.Response, token: string, expiry: number, domain: string, path: string, secure: boolean): void;
/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export declare function attachRefreshTokenToCookie(res: express.Response, token: string, expiry: number, domain: string, path: string, secure: boolean): void;
export declare function getAccessTokenFromCookie(req: express.Request): string | undefined;
export declare function getRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function getAntiCsrfTokenFromHeaders(req: express.Request): string | undefined;
export declare function getIdRefreshTokenFromCookie(req: express.Request): string | undefined;
export declare function setAntiCsrfTokenInHeaders(res: express.Response, antiCsrfToken: string): void;
export declare function setIdRefreshTokenInHeaderAndCookie(res: express.Response, idRefreshToken: string, expiry: number, domain: string, secure: boolean, path: string): void;
export declare function getHeader(req: express.Request, key: string): string | undefined;
export declare function setOptionsAPIHeader(res: express.Response): void;
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
export declare function setCookie(res: ServerResponse, name: string, value: string, domain: string, secure: boolean, httpOnly: boolean, expires: number, path: string, sameSite?: "strict" | "lax" | "none"): ServerResponse;
export declare function getCookieValue(req: IncomingMessage, key: string): string | undefined;
