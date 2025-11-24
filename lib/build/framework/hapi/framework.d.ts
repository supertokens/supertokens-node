// @ts-nocheck
import type { Request, ResponseToolkit, Plugin, ResponseObject } from "@hapi/hapi";
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
import type { SessionContainerInterface } from "../../recipe/session/types";
export declare class HapiRequest extends BaseRequest {
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
export interface ExtendedResponseToolkit extends ResponseToolkit {
    lazyHeaderBindings: (
        h: ResponseToolkit,
        key: string,
        value: string | undefined,
        allowDuplicateKey: boolean
    ) => void;
}
export declare class HapiResponse extends BaseResponse {
    private response;
    private statusCode;
    private content;
    responseSet: boolean;
    statusSet: boolean;
    constructor(response: ExtendedResponseToolkit);
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
    /**
     * @param {any} content
     */
    sendJSONResponse: (content: any) => void;
    sendResponse: (overwriteHeaders?: boolean) => ResponseObject;
}
export interface SessionRequest extends Request {
    session?: SessionContainerInterface;
}
export interface HapiFramework extends Framework {
    plugin: Plugin<{}>;
}
export declare const HapiWrapper: HapiFramework;
