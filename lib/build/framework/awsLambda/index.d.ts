// @ts-nocheck
export type { SessionEvent, SessionEventV2 } from "./framework";
export declare const middleware: (handler?: import("aws-lambda").Handler) => import("aws-lambda").Handler;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
