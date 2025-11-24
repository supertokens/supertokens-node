// @ts-nocheck
import type { Request, Response } from "express";
import type { IncomingMessage } from "http";
import { ServerResponse } from "http";
import type { HTTPMethod } from "../types";
export declare function getCookieValueFromHeaders(headers: any, key: string): string | undefined;
export declare function getCookieValueFromIncomingMessage(request: IncomingMessage, key: string): string | undefined;
export declare function getHeaderValueFromIncomingMessage(request: IncomingMessage, key: string): string | undefined;
export declare function normalizeHeaderValue(value: string | string[] | undefined): string | undefined;
export declare function parseJSONBodyFromRequest(req: IncomingMessage): Promise<any>;
export declare function parseURLEncodedFormData(req: IncomingMessage): Promise<any>;
export declare function assertThatBodyParserHasBeenUsedForExpressLikeRequest(
    method: HTTPMethod,
    request: Request
): Promise<void>;
export declare function assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(request: Request): Promise<void>;
export declare function setHeaderForExpressLikeResponse(
    res: Response,
    key: string,
    value: string,
    allowDuplicateKey: boolean
): void;
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
export declare function setCookieForServerResponse(
    res: ServerResponse,
    key: string,
    value: string,
    domain: string | undefined,
    secure: boolean,
    httpOnly: boolean,
    expires: number,
    path: string,
    sameSite: "strict" | "lax" | "none"
): ServerResponse<IncomingMessage>;
export declare function getCookieValueToSetInHeader(
    prev: string | string[] | undefined,
    val: string | string[],
    key: string
): string | string[];
export declare function serializeCookieValue(
    key: string,
    value: string,
    domain: string | undefined,
    secure: boolean,
    httpOnly: boolean,
    expires: number,
    path: string,
    sameSite: "strict" | "lax" | "none"
): string;
export declare function isBoxedPrimitive(value: any): boolean;
