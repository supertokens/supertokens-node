// @ts-nocheck
import { FastifyRequest as OriginalFastifyRequest, FastifyReply, FastifyPluginCallback } from "./types";
import type { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
import type { SessionContainerInterface } from "../../recipe/session/types";
export declare class FastifyRequest extends BaseRequest {
    private request;
    constructor(request: OriginalFastifyRequest);
    protected getFormDataFromRequestBody: () => Promise<any>;
    protected getJSONFromRequestBody: () => Promise<any>;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class FastifyResponse extends BaseResponse {
    private response;
    private statusCode;
    constructor(response: FastifyReply);
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
}
export type SessionRequest<TRequest extends OriginalFastifyRequest = OriginalFastifyRequest> = TRequest & {
    session?: SessionContainerInterface;
};
export interface FastifyFramework extends Framework {
    plugin: FastifyPluginCallback;
    errorHandler: () => (err: any, req: OriginalFastifyRequest, res: FastifyReply) => Promise<void>;
}
export declare const errorHandler: () => (err: any, req: OriginalFastifyRequest, res: FastifyReply) => Promise<void>;
export declare const FastifyWrapper: FastifyFramework;
