// @ts-nocheck
export { PreParsedRequest, CollectingResponse } from "./framework";
export declare const middleware: <OrigReqType = import("..").BaseRequest, OrigRespType = import("..").BaseResponse>(
    wrapRequest?: (req: OrigReqType) => import("..").BaseRequest,
    wrapResponse?: (req: OrigRespType) => import("..").BaseResponse
) => (
    request: OrigReqType,
    response: OrigRespType,
    next?: import("./framework").NextFunction
) => Promise<
    | {
          handled: boolean;
          error?: undefined;
      }
    | {
          error: any;
          handled?: undefined;
      }
>;
export declare const errorHandler: () => (
    err: any,
    request: import("..").BaseRequest,
    response: import("..").BaseResponse,
    next: import("./framework").NextFunction
) => Promise<void>;
