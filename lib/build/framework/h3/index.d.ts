// @ts-nocheck
export type { SessionEvent } from "./framework";
export declare const middleware: import("h3").EventHandler<any>;
export declare const errorHandler: import("h3").EventHandler<any>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
