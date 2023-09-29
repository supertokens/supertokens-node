// @ts-nocheck
import type { AppInfo, NormalisedAppinfo, HTTPMethod, JSONObject } from "./types";
import type { BaseRequest, BaseResponse } from "./framework";
import { User } from "./user";
import { SessionContainer } from "./recipe/session";
export declare const doFetch: typeof fetch;
export declare function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined;
export declare function maxVersion(version1: string, version2: string): string;
export declare function normaliseInputAppInfoOrThrowError(appInfo: AppInfo): NormalisedAppinfo;
export declare function normaliseHttpMethod(method: string): HTTPMethod;
export declare function sendNon200ResponseWithMessage(res: BaseResponse, message: string, statusCode: number): void;
export declare function sendNon200Response(res: BaseResponse, statusCode: number, body: JSONObject): void;
export declare function send200Response(res: BaseResponse, responseJson: any): void;
export declare function isAnIpAddress(ipaddress: string): boolean;
export declare function getBackwardsCompatibleUserInfo(
    req: BaseRequest,
    result: {
        user: User;
        session: SessionContainer;
        createdNewRecipeUser?: boolean;
    }
): JSONObject;
export declare function doesRequestSupportFDI(req: BaseRequest, version: string): boolean;
export declare function getRidFromHeader(req: BaseRequest): string | undefined;
export declare function frontendHasInterceptor(req: BaseRequest): boolean;
export declare function humaniseMilliseconds(ms: number): string;
export declare function makeDefaultUserContextFromAPI(request: BaseRequest): any;
export declare function setRequestInUserContextIfNotDefined(userContext: any | undefined, request: BaseRequest): any;
export declare function getTopLevelDomainForSameSiteResolution(url: string): string;
export declare function getFromObjectCaseInsensitive<T>(key: string, object: Record<string, T>): T | undefined;
export declare function postWithFetch(
    url: string,
    headers: Record<string, string>,
    body: any,
    {
        successLog,
        errorLogHeader,
    }: {
        successLog: string;
        errorLogHeader: string;
    }
): Promise<
    | {
          resp: {
              status: number;
              body: any;
          };
      }
    | {
          error: any;
      }
>;
export declare function normaliseEmail(email: string): string;
