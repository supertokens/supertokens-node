import { AWSWrapper } from "./framework";
export default AWSWrapper;
export declare const middleware: () => import("aws-lambda").Handler<any, any>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
