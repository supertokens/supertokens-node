import { HapiWrapper } from "./framework";
export default HapiWrapper;
export declare const plugin: import("@hapi/hapi").Plugin<{}>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
