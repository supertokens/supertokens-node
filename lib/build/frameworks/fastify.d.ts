/// <reference types="node" />
import type { FastifyInstance, FastifyRequest as OriginalFastifyRequest, FastifyReply } from "fastify";
import type { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import type { Framework } from "./types";
import type { SessionContainerInterface, VerifySessionOptions } from "../recipe/session/types";
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
declare function plugin(fastify: FastifyInstance, _: any, done: Function): void;
export interface SessionRequest extends OriginalFastifyRequest {
    session?: SessionContainerInterface;
}
export declare const middleware: () => typeof plugin;
export declare const errorHandler: () => (
    err: any,
    req: OriginalFastifyRequest<
        import("fastify/types/route").RouteGenericInterface,
        import("http").Server,
        import("http").IncomingMessage
    >,
    res: FastifyReply<
        import("http").Server,
        import("http").IncomingMessage,
        import("http").ServerResponse,
        import("fastify/types/route").RouteGenericInterface,
        unknown
    >
) => Promise<void>;
export declare const verifySession: (
    options: VerifySessionOptions | undefined
) => (
    req: SessionRequest,
    res: FastifyReply<
        import("http").Server,
        import("http").IncomingMessage,
        import("http").ServerResponse,
        import("fastify/types/route").RouteGenericInterface,
        unknown
    >
) => Promise<void>;
declare const FastifyWrapper: Framework;
export default FastifyWrapper;
