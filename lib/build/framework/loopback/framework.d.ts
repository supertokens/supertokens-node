// @ts-nocheck
import type { MiddlewareContext, Response, Middleware } from "@loopback/rest";
import { SessionContainerInterface } from "../../recipe/session/types";
import { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
export declare class LoopbackRequest extends BaseRequest {
    private request;
    constructor(ctx: MiddlewareContext);
    protected getFormDataFromRequestBody: () => Promise<any>;
    protected getJSONFromRequestBody: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class LoopbackResponse extends BaseResponse {
    response: Response;
    private statusCode;
    constructor(ctx: MiddlewareContext);
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
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
}
export interface SessionContext extends MiddlewareContext {
    session?: SessionContainerInterface;
}
export interface LoopbackFramework extends Framework {
    middleware: Middleware;
}
export declare const middleware: Middleware;
export declare const LoopbackWrapper: LoopbackFramework;
