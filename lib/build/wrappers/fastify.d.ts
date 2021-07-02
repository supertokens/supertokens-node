import type { FastifyRequest as OriginalFastifyRequest, FastifyReply } from "fastify";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import { Wrapper } from "./types";
import { SessionContainerInterface } from "../recipe/session/types";
export declare class FastifyRequest extends BaseRequest {
    private request;
    constructor(request: OriginalFastifyRequest);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class FastifyResponse extends BaseResponse {
    private response;
    private statusCode;
    constructor(response: FastifyReply);
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
    /**
     * @param {any} content
     */
    sendJSONResponse: (content: any) => void;
}
export interface SessionRequest extends OriginalFastifyRequest {
    session?: SessionContainerInterface;
}
declare const FastifyWrapper: Wrapper;
export default FastifyWrapper;
