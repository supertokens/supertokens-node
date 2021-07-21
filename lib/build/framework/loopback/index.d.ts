import { LoopbackWrapper } from "./framework";
export default LoopbackWrapper;
export declare const middleware: import("@loopback/express").Middleware;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
