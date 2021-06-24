import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
import * as express from "express";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static Error: typeof SuperTokensError;
    static middleware(): (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    static errorHandler(): (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => Promise<void>;
    static getAllCORSHeaders(): string[];
    static getUserCount(includeRecipeIds?: string[]): Promise<number>;
}
export declare let init: typeof SuperTokens.init;
export declare let middleware: typeof SuperTokensWrapper.middleware;
export declare let errorHandler: typeof SuperTokensWrapper.errorHandler;
export declare let getAllCORSHeaders: typeof SuperTokensWrapper.getAllCORSHeaders;
export declare let getUserCount: typeof SuperTokensWrapper.getUserCount;
export declare let Error: typeof SuperTokensError;
