// @ts-nocheck
import type { AppInfo, NormalisedAppinfo, HTTPMethod } from "./types";
import type { BaseRequest, BaseResponse } from "./framework";
export declare function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined;
export declare function maxVersion(version1: string, version2: string): string;
export declare function normaliseInputAppInfoOrThrowError(appInfo: AppInfo): NormalisedAppinfo;
export declare function getRIDFromRequest(req: BaseRequest): string | undefined;
export declare function normaliseHttpMethod(method: string): HTTPMethod;
export declare function sendNon200Response(res: BaseResponse, message: string, statusCode: number): void;
export declare function send200Response(res: BaseResponse, responseJson: any): void;
export declare function isAnIpAddress(ipaddress: string): boolean;
export declare function frontendHasInterceptor(req: BaseRequest): boolean;
export declare function humaniseMilliseconds(ms: number): string;
export declare function makeDefaultUserContextFromAPI(request: BaseRequest): any;
