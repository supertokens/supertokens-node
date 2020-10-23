/// <reference types="express" />
import SuperTokens from "./supertokens";
import STError from "./error";
export * from "./error";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static middleware: () => (request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    static errorHandler: () => (err: any, request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => void;
    static getAllCORSHeaders: () => string[];
    static Error: typeof STError;
}
export declare let init: typeof SuperTokens.init;
export declare let middleware: () => (request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
export declare let errorHandler: () => (err: any, request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => void;
export declare let getAllCORSHeaders: () => string[];
