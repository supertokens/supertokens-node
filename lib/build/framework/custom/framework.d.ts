// @ts-nocheck
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { SessionContainerInterface } from "../../recipe/session/types";
type RequestInfo = {
    url: string;
    method: HTTPMethod;
    headers: Headers;
    cookies: Record<string, string>;
    query: Record<string, string>;
    getJSONBody: () => Promise<any>;
    getFormBody: () => Promise<any>;
    setSession?: (session: SessionContainerInterface) => void;
};
export declare class PreParsedRequest extends BaseRequest {
    private request;
    private _session?;
    get session(): SessionContainerInterface | undefined;
    set session(value: SessionContainerInterface | undefined);
    constructor(request: RequestInfo);
    protected getJSONFromRequestBody: () => Promise<any>;
    protected getFormDataFromRequestBody: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export type CookieInfo = {
    key: string;
    value: string;
    domain: string | undefined;
    secure: boolean;
    httpOnly: boolean;
    expires: number;
    path: string;
    sameSite: "strict" | "lax" | "none";
};
export declare class CollectingResponse extends BaseResponse {
    statusCode: number;
    readonly headers: Headers;
    readonly cookies: CookieInfo[];
    body?: string;
    constructor();
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
export type NextFunction = (err?: any) => void;
export declare const middleware: <OrigReqType = BaseRequest, OrigRespType = BaseResponse>(
    wrapRequest?: (req: OrigReqType) => BaseRequest,
    wrapResponse?: (req: OrigRespType) => BaseResponse
) => (
    request: OrigReqType,
    response: OrigRespType,
    next?: NextFunction
) => Promise<
    | {
          handled: boolean;
          error?: undefined;
      }
    | {
          error: any;
          handled?: undefined;
      }
>;
export declare const errorHandler: () => (
    err: any,
    request: BaseRequest,
    response: BaseResponse,
    next: NextFunction
) => Promise<void>;
export declare const CustomFrameworkWrapper: {
    middleware: <OrigReqType = BaseRequest, OrigRespType = BaseResponse>(
        wrapRequest?: (req: OrigReqType) => BaseRequest,
        wrapResponse?: (req: OrigRespType) => BaseResponse
    ) => (
        request: OrigReqType,
        response: OrigRespType,
        next?: NextFunction
    ) => Promise<
        | {
              handled: boolean;
              error?: undefined;
          }
        | {
              error: any;
              handled?: undefined;
          }
    >;
    errorHandler: () => (err: any, request: BaseRequest, response: BaseResponse, next: NextFunction) => Promise<void>;
};
export {};
