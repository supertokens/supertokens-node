// @ts-nocheck
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { UserContext } from "./types";
import { NetworkInterceptor } from "./types";
import { PathParam, RequestBody, ResponseBody } from "./core/types";
import { paths } from "./core/paths";
export declare class Querier {
    private static initCalled;
    private static hosts;
    private static apiKey;
    private static apiVersion;
    private static lastTriedIndex;
    private static hostsAliveForTesting;
    private static networkInterceptor;
    private static globalCacheTag;
    private static disableCache;
    private __hosts;
    private rIdToCore;
    private constructor();
    getAPIVersion: (userContext: UserContext) => Promise<string>;
    static reset(): void;
    getHostsAliveForTesting: () => Set<string>;
    static getNewInstanceOrThrowError(rIdToCore?: string): Querier;
    static init(
        hosts?: {
            domain: NormalisedURLDomain;
            basePath: NormalisedURLPath;
        }[],
        apiKey?: string,
        networkInterceptor?: NetworkInterceptor,
        disableCache?: boolean
    ): void;
    private getPath;
    sendPostRequest: <P extends keyof paths>(
        templatePath: PathParam<P>,
        body: RequestBody<P, "post">,
        userContext: UserContext
    ) => Promise<ResponseBody<P, "post">>;
    sendDeleteRequest: <P extends keyof paths>(
        templatePath: PathParam<P>,
        body: RequestBody<P, "delete">,
        params: any | undefined,
        userContext: UserContext
    ) => Promise<ResponseBody<P, "delete">>;
    sendGetRequest: <P extends keyof paths>(
        templatePath: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<ResponseBody<P, "get">>;
    sendGetRequestWithResponseHeaders: <P extends keyof paths>(
        templatePath: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        inpHeaders: Record<string, string> | undefined,
        userContext: UserContext
    ) => Promise<{
        body: ResponseBody<P, "get">;
        headers: Headers;
    }>;
    sendPutRequest: <P extends keyof paths>(
        templatePath: PathParam<P>,
        body: RequestBody<P, "put">,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<ResponseBody<P, "put">>;
    sendPatchRequest: <P extends keyof paths>(
        templatePath: PathParam<P>,
        body: RequestBody<P, "patch">,
        userContext: UserContext
    ) => Promise<ResponseBody<P, "patch">>;
    invalidateCoreCallCache: (userContext: UserContext, updGlobalCacheTagIfNecessary?: boolean) => void;
    getAllCoreUrlsForPath(path: string): string[];
    private sendRequestHelper;
}
