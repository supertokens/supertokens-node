import { Request, Response } from "express";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import { Wrapper } from "./types";
import { SessionContainerInterface } from "../recipe/session/types";
export declare class ExpressRequest extends BaseRequest {
    private request;
    private parserChecked;
    constructor(request: Request);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class ExpressResponse extends BaseResponse {
    private response;
    private statusCode;
    constructor(response: Response);
    setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
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
declare const ExpressWrapper: Wrapper;
export default ExpressWrapper;
