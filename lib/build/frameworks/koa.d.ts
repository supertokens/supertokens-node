import type { Context, Next } from "koa";
import type { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import { SessionContainerInterface, VerifySessionOptions } from "../recipe/session/types";
import { Framework } from "./types";
export declare class KoaRequest extends BaseRequest {
    private ctx;
    private parsedJSONBody;
    constructor(ctx: Context);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
export declare class KoaResponse extends BaseResponse {
    private ctx;
    constructor(ctx: Context);
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
export interface SessionRequest extends Context {
    session?: SessionContainerInterface;
}
export declare const middleware: () => (ctx: Context, next: Next) => Promise<void>;
export declare const errorHandler: () => void;
export declare const verifySession: (
    options: VerifySessionOptions | undefined
) => (ctx: Context, next: Next) => Promise<void>;
declare const KoaWrapper: Framework;
export default KoaWrapper;
