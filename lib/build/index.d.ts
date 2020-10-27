/// <reference types="express" />
import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static Error: typeof SuperTokensError;
    static middleware(): (request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    static errorHandler(): (err: any, request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    static getAllCORSHeaders(): string[];
}
export declare let init: typeof SuperTokens.init;
export declare let middleware: typeof SuperTokensWrapper.middleware;
export declare let errorHandler: typeof SuperTokensWrapper.errorHandler;
export declare let getAllCORSHeaders: typeof SuperTokensWrapper.getAllCORSHeaders;
export declare let Error: typeof SuperTokensError;
