// @ts-nocheck
/// <reference types="qs" />
export type { SessionRequest } from "./framework";
export declare const middleware: () => (
    req: import("express").Request<
        import("express-serve-static-core").ParamsDictionary,
        any,
        any,
        import("qs").ParsedQs,
        Record<string, any>
    >,
    res: import("express").Response<any, Record<string, any>>,
    next: import("express").NextFunction
) => Promise<void>;
export declare const errorHandler: () => (
    err: any,
    req: import("express").Request<
        import("express-serve-static-core").ParamsDictionary,
        any,
        any,
        import("qs").ParsedQs,
        Record<string, any>
    >,
    res: import("express").Response<any, Record<string, any>>,
    next: import("express").NextFunction
) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
