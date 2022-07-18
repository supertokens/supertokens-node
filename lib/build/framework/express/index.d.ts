// @ts-nocheck
export type { SessionRequest } from "./framework";
export declare const middleware: () => (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
) => Promise<void>;
export declare const errorHandler: () => (
    err: any,
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
