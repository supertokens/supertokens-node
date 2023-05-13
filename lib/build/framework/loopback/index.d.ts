// @ts-nocheck
export type { SessionContext } from "./framework";
export declare const middleware: import("@loopback/rest").Middleware;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
