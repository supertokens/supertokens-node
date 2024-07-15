// @ts-nocheck
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { UserContext } from "./types";
import { NetworkInterceptor } from "./types";
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
    sendPostRequest: <T = any>(path: NormalisedURLPath, body: any, userContext: UserContext) => Promise<T>;
    sendDeleteRequest: (
        path: NormalisedURLPath,
        body: any,
        params: any | undefined,
        userContext: UserContext
    ) => Promise<any>;
    sendGetRequest: (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<any>;
    sendGetRequestWithResponseHeaders: (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<{
        body: any;
        headers: Headers;
    }>;
    sendPutRequest: (path: NormalisedURLPath, body: any, userContext: UserContext) => Promise<any>;
    invalidateCoreCallCache: (userContext: UserContext, updGlobalCacheTagIfNecessary?: boolean) => void;
    getAllCoreUrlsForPath(path: string): string[];
    private sendRequestHelper;
}
