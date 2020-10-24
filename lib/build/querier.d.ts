import NormalisedURLDomain from "./normalisedURLDomain";
export declare class Querier {
    private static initCalled;
    private static hosts;
    private static apiKey;
    private static apiVersion;
    private static lastTriedIndex;
    private static hostsAliveForTesting;
    private __hosts;
    private rId;
    private constructor();
    getAPIVersion: () => Promise<string>;
    static reset(): void;
    getHostsAliveForTesting: () => Set<string>;
    static getInstanceOrThrowError(rId: string): Querier;
    static init(hosts: NormalisedURLDomain[], apiKey?: string): void;
    sendPostRequest: (path: string, body: any) => Promise<any>;
    sendDeleteRequest: (path: string, body: any) => Promise<any>;
    sendGetRequest: (path: string, params: any) => Promise<any>;
    sendPutRequest: (path: string, body: any) => Promise<any>;
    private sendRequestHelper;
}
