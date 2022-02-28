// @ts-nocheck
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
export declare class Querier {
    private static initCalled;
    private static hosts;
    private static apiKey;
    private static apiVersion;
    private static lastTriedIndex;
    private static hostsAliveForTesting;
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
        apiKey?: string
    ): void;
    sendPostRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    sendDeleteRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    sendGetRequest: (path: NormalisedURLPath, params: any) => Promise<any>;
    sendPutRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    private sendRequestHelper;
}
