// @ts-nocheck
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { NetworkInterceptor } from "./types";
export declare class Querier {
    private static initCalled;
    private static hosts;
    private static apiKey;
    private static apiVersion;
    private static lastTriedIndex;
    private static hostsAliveForTesting;
    private static networkInterceptor;
    private __hosts;
    private rIdToCore;
    private constructor();
    getAPIVersion: () => Promise<string>;
    static reset(): void;
    getHostsAliveForTesting: () => Set<string>;
    static getNewInstanceOrThrowError(rIdToCore?: string): Querier;
    static init(
        hosts?: {
            domain: NormalisedURLDomain;
            basePath: NormalisedURLPath;
        }[],
        apiKey?: string,
        networkInterceptor?: NetworkInterceptor
    ): void;
    sendPostRequest: <T = any>(path: NormalisedURLPath, body: any, userContext: any) => Promise<T>;
    sendDeleteRequest: (path: NormalisedURLPath, body: any, params: any, userContext: any) => Promise<any>;
    sendGetRequest: (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: any
    ) => Promise<any>;
    sendGetRequestWithResponseHeaders: (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: any
    ) => Promise<{
        body: any;
        headers: Headers;
    }>;
    sendPutRequest: (path: NormalisedURLPath, body: any, userContext: any) => Promise<any>;
    getAllCoreUrlsForPath(path: string): string[];
    private sendRequestHelper;
}
