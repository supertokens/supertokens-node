// @ts-nocheck
import type { Context, Next } from "koa";
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { SessionContainerInterface } from "../../recipe/session/types";
import { Framework } from "../types";
export declare class KoaRequest extends BaseRequest {
    private ctx;
    constructor(ctx: Context);
    protected getFormDataFromRequestBody: () => Promise<any>;
    protected getJSONFromRequestBody: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class KoaResponse extends BaseResponse {
    private ctx;
    responseSet: boolean;
    statusSet: boolean;
    constructor(ctx: Context);
    sendHTMLResponse: (html: string) => void;
    setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    removeHeader: (key: string) => void;
    setCookie: (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => void;
    /**
     * @param {number} statusCode
     */
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
}
export interface SessionContext extends Context {
    session?: SessionContainerInterface;
}
export declare const middleware: () => (ctx: Context, next: Next) => Promise<any>;
export interface KoaFramework extends Framework {
    middleware: () => (ctx: Context, next: Next) => Promise<void>;
}
export declare const KoaWrapper: KoaFramework;
