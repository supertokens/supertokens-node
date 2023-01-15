// @ts-nocheck
import { EventHandler, H3Event } from "h3";
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
import type { SessionContainerInterface } from "../../recipe/session/types";
export declare class H3Request extends BaseRequest {
    private event;
    constructor(event: H3Event);
    getFormData: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class H3Response extends BaseResponse {
    private event;
    private statusCode;
    constructor(event: H3Event);
    sendHTMLResponse: (html: string) => void;
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
export interface SessionEvent extends H3Event {
    context: {
        session?: SessionContainerInterface;
    };
}
export declare const middleware: EventHandler<void>;
export declare const errorHandler: EventHandler<void>;
export interface H3Framework extends Framework {
    middleware: EventHandler<any>;
    errorHandler: EventHandler<any>;
}
export declare const H3Wrapper: H3Framework;
