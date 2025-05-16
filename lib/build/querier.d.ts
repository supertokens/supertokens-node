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
        template_path: PathParam<P>,
        body: RequestBody<P, "post">,
        userContext: UserContext
    ) => Promise<
        import("./core/types").UncleanedResponseBody<P, "post"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "post">>
            : never
    >;
    sendDeleteRequest: <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "delete">,
        params: any | undefined,
        userContext: UserContext
    ) => Promise<
        import("./core/types").UncleanedResponseBody<P, "delete"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "delete">>
            : never
    >;
    sendGetRequest: <P extends keyof paths>(
        template_path: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<
        import("./core/types").UncleanedResponseBody<P, "get"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "get">>
            : never
    >;
    sendGetRequestWithResponseHeaders: <P extends keyof paths>(
        template_path: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        inpHeaders: Record<string, string> | undefined,
        userContext: UserContext
    ) => Promise<{
        body: import("./core/types").UncleanedResponseBody<P, "get"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "get">>
            : never;
        headers: Headers;
    }>;
    sendPutRequest: <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "put">,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ) => Promise<
        import("./core/types").UncleanedResponseBody<P, "put"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "put">>
            : never
    >;
    sendPatchRequest: <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "patch">,
        userContext: UserContext
    ) => Promise<
        import("./core/types").UncleanedResponseBody<P, "patch"> extends any
            ? Required<import("./core/types").UncleanedResponseBody<P, "patch">>
            : never
    >;
    invalidateCoreCallCache: (userContext: UserContext, updGlobalCacheTagIfNecessary?: boolean) => void;
    getAllCoreUrlsForPath(path: string): string[];
    private sendRequestHelper;
}
