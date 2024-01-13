// @ts-nocheck
import type { Request, Response, NextFunction } from "express";
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
import type { SessionContainerInterface } from "../../recipe/session/types";
export declare class ExpressRequest extends BaseRequest {
    private request;
    constructor(request: Request);
    protected getFormDataFromRequestBody: () => Promise<any>;
    protected getJSONFromRequestBody: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class ExpressResponse extends BaseResponse {
    private response;
    private statusCode;
    constructor(response: Response);
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
export interface SessionRequest extends Request {
    session?: SessionContainerInterface;
}
export declare const middleware: () => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const errorHandler: () => (err: any, req: Request, res: Response, next: NextFunction) => Promise<void>;
export interface ExpressFramework extends Framework {
    middleware: () => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    errorHandler: () => (err: any, req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const ExpressWrapper: ExpressFramework;
