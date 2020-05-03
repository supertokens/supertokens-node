import { TypeInput } from "./types";
export declare class Querier {
    static instance: Querier | undefined;
    private hosts;
    private lastTriedIndex;
    private hostsAliveForTesting;
    private apiVersion;
    private constructor();
    getAPIVersion: () => Promise<string>;
    static reset(): void;
    getHostsAliveForTesting: () => Set<string>;
    static getInstance(): Querier;
    static initInstance(hosts: TypeInput): void;
    sendPostRequest: (path: string, body: any) => Promise<any>;
    sendDeleteRequest: (path: string, body: any) => Promise<any>;
    sendGetRequest: (path: string, params: any) => Promise<any>;
    sendPutRequest: (path: string, body: any) => Promise<any>;
    private sendRequestHelper;
}
