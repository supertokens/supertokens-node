import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import RecipeModule from "./recipeModule";
export declare class Querier {
    private static initCalled;
    private static hosts;
    private static apiKey;
    private static apiVersion;
    private static lastTriedIndex;
    private static hostsAliveForTesting;
    private __hosts;
    private recipe;
    private rIdToCore;
    private isInServerlessEnv;
    private constructor();
    getAPIVersion: () => Promise<string>;
    static reset(): void;
    getHostsAliveForTesting: () => Set<string>;
    static getInstanceOrThrowError(isInServerlessEnv: boolean, recipe: RecipeModule | undefined, rIdToCore?: string): Querier;
    static init(hosts: NormalisedURLDomain[], apiKey?: string): void;
    sendPostRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    sendDeleteRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    sendGetRequest: (path: NormalisedURLPath, params: any) => Promise<any>;
    sendPutRequest: (path: NormalisedURLPath, body: any) => Promise<any>;
    private sendRequestHelper;
}
