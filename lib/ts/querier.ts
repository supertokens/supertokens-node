/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import { doFetch, getLargestVersionFromIntersection, isTestEnv } from "./utils";
import { cdiSupported } from "./version";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { PROCESS_STATE, ProcessState } from "./processState";
import { RATE_LIMIT_STATUS_CODE } from "./constants";
import { logDebugMessage } from "./logger";
import { UserContext } from "./types";
import { NetworkInterceptor } from "./types";
import SuperTokens from "./supertokens";

import { PathParam, RequestBody, ResponseBody } from "./core/types";
import { paths } from "./core/paths";

export class Querier {
    private static initCalled = false;
    private static hosts: { domain: NormalisedURLDomain; basePath: NormalisedURLPath }[] | undefined = undefined;
    private static apiKey: string | undefined = undefined;
    private static apiVersion: string | undefined = undefined;

    private static lastTriedIndex = 0;
    private static hostsAliveForTesting: Set<string> = new Set<string>();

    private static networkInterceptor: NetworkInterceptor | undefined = undefined;
    private static globalCacheTag = Date.now();
    private static disableCache = false;

    private __hosts: { domain: NormalisedURLDomain; basePath: NormalisedURLPath }[] | undefined;
    private rIdToCore: string | undefined;

    // we have rIdToCore so that recipes can force change the rId sent to core. This is a hack until the core is able
    // to support multiple rIds per API
    private constructor(
        hosts: { domain: NormalisedURLDomain; basePath: NormalisedURLPath }[] | undefined,
        rIdToCore?: string
    ) {
        this.__hosts = hosts;
        this.rIdToCore = rIdToCore;
    }

    getAPIVersion = async (userContext: UserContext): Promise<string> => {
        if (Querier.apiVersion !== undefined) {
            return Querier.apiVersion;
        }
        ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION);
        const st = SuperTokens.getInstanceOrThrowError();
        const appInfo = st.appInfo;

        const request = st.getRequestFromUserContext(userContext);
        const queryParamsObj: {
            apiDomain: string;
            websiteDomain: string;
        } = {
            apiDomain: appInfo.apiDomain.getAsStringDangerous(),
            websiteDomain: appInfo.getOrigin({ request, userContext }).getAsStringDangerous(),
        };
        const queryParams = new URLSearchParams(queryParamsObj).toString();

        let { body: response } = await this.sendRequestHelper(
            new NormalisedURLPath("/apiversion"),
            "GET",
            async (url: string) => {
                let headers: any = {};
                if (Querier.apiKey !== undefined) {
                    headers = {
                        "api-key": Querier.apiKey,
                    };
                }

                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "get",
                            headers: headers,
                            params: queryParamsObj,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                }

                let response = await doFetch(url + `?${queryParams}`, {
                    method: "GET",
                    headers,
                });
                return response;
            },
            this.__hosts?.length || 0
        );
        let cdiSupportedByServer: string[] = response.versions;
        let supportedVersion = getLargestVersionFromIntersection(cdiSupportedByServer, cdiSupported);
        if (supportedVersion === undefined) {
            throw Error(
                "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
            );
        }
        Querier.apiVersion = supportedVersion;
        return Querier.apiVersion;
    };

    static reset() {
        if (!isTestEnv()) {
            throw Error("calling testing function in non testing env");
        }
        Querier.initCalled = false;
        Querier.apiVersion = undefined;
    }

    getHostsAliveForTesting = () => {
        if (!isTestEnv()) {
            throw Error("calling testing function in non testing env");
        }
        return Querier.hostsAliveForTesting;
    };

    static getNewInstanceOrThrowError(rIdToCore?: string): Querier {
        if (!Querier.initCalled) {
            throw Error("Please call the supertokens.init function before using SuperTokens");
        }
        return new Querier(Querier.hosts, rIdToCore);
    }

    static init(
        hosts?: { domain: NormalisedURLDomain; basePath: NormalisedURLPath }[],
        apiKey?: string,
        networkInterceptor?: NetworkInterceptor,
        disableCache?: boolean
    ) {
        if (!Querier.initCalled) {
            logDebugMessage("querier initialized");
            Querier.initCalled = true;
            Querier.hosts = hosts;
            Querier.apiKey = apiKey;
            Querier.apiVersion = undefined;
            Querier.lastTriedIndex = 0;
            Querier.hostsAliveForTesting = new Set<string>();
            Querier.networkInterceptor = networkInterceptor;
            Querier.disableCache = disableCache ?? false;
        }
    }

    private getPath = <P extends keyof paths>(path: PathParam<P>): NormalisedURLPath => {
        const template = typeof path === "string" ? path : path.path;
        const params = typeof path === "string" ? {} : path.params ?? {};

        let populated = String(template);
        for (const [key, value] of Object.entries(params)) {
            populated = populated.replace(new RegExp(`<${key}>`, "g"), String(value));
        }

        return new NormalisedURLPath(populated);
    };

    // path should start with "/"
    sendPostRequest = async <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "post">,
        userContext: UserContext
    ): Promise<ResponseBody<P, "post">> => {
        this.invalidateCoreCallCache(userContext);
        const path = this.getPath(template_path);

        const { body: respBody } = await this.sendRequestHelper(
            path,
            "POST",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = {
                    "cdi-version": apiVersion,
                };
                headers["content-type"] = "application/json; charset=utf-8";

                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "post",
                            headers: headers,
                            body: body,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.body !== undefined) {
                        body = request.body;
                    }
                }
                return doFetch(url, {
                    method: "POST",
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
        return respBody;
    };

    // path should start with "/"
    sendDeleteRequest = async <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "delete">,
        params: any | undefined,
        userContext: UserContext
    ): Promise<ResponseBody<P, "delete">> => {
        this.invalidateCoreCallCache(userContext);
        const path = this.getPath(template_path);

        const { body: respBody } = await this.sendRequestHelper(
            path,
            "DELETE",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = { "cdi-version": apiVersion, "content-type": "application/json; charset=utf-8" };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "delete",
                            headers: headers,
                            params: params,
                            body: body,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.body !== undefined) {
                        body = request.body;
                    }
                    if (request.params !== undefined) {
                        params = request.params;
                    }
                }

                const finalURL = new URL(url);
                const searchParams = new URLSearchParams(params);
                finalURL.search = searchParams.toString();

                return doFetch(finalURL.toString(), {
                    method: "DELETE",
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
        return respBody;
    };

    // path should start with "/"
    sendGetRequest = async <P extends keyof paths>(
        template_path: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ): Promise<ResponseBody<P, "get">> => {
        const path = this.getPath(template_path);
        const { body: respBody } = await this.sendRequestHelper(
            path,
            "GET",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = { "cdi-version": apiVersion };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }

                /* CACHE CHECK BEGIN */
                const sortedKeys = Object.keys(params).sort();
                const sortedHeaderKeys = Object.keys(headers).sort();
                let uniqueKey = path.getAsStringDangerous();

                for (const key of sortedKeys) {
                    const value = params[key];
                    uniqueKey += `;${key}=${value}`;
                }

                uniqueKey += ";hdrs";

                for (const key of sortedHeaderKeys) {
                    const value = headers[key];
                    uniqueKey += `;${key}=${value}`;
                }

                // If globalCacheTag doesn't match the current one (or if it's not defined), we invalidate the cache, because that means
                // that there was a non-GET call that didn't have a proper userContext passed to it.
                // However, we do not want to invalidate all global caches for a GET call even if it was made without a proper user context.
                if (userContext._default?.globalCacheTag !== Querier.globalCacheTag) {
                    this.invalidateCoreCallCache(userContext, false);
                }

                logDebugMessage("Checking cache existence");
                if (!Querier.disableCache && uniqueKey in (userContext._default?.coreCallCache ?? {})) {
                    // Clone the cached response before returning it
                    const cachedResponse = userContext._default.coreCallCache[uniqueKey];
                    return cachedResponse.clone();
                }
                /* CACHE CHECK END */

                logDebugMessage("Cache does not exist, making network request");
                if (Querier.networkInterceptor !== undefined) {
                    logDebugMessage("Network interceptor found, applying interceptor");
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "get",
                            headers: headers,
                            params: params,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.params !== undefined) {
                        params = request.params;
                    }
                }
                const finalURL = new URL(url);
                const searchParams = new URLSearchParams(
                    Object.entries(params).filter(([_, value]) => value !== undefined) as string[][]
                );
                finalURL.search = searchParams.toString();

                // Update cache and return
                let response = await doFetch(finalURL.toString(), {
                    method: "GET",
                    headers,
                });

                if (response.status === 302) {
                    return response;
                }

                if (response.status === 200 && !Querier.disableCache) {
                    // Clone the response before caching it
                    const responseClone = response.clone();
                    userContext._default = {
                        ...userContext._default,
                        coreCallCache: {
                            ...userContext._default?.coreCallCache,
                            [uniqueKey]: responseClone,
                        },
                        globalCacheTag: Querier.globalCacheTag,
                    };
                }

                return response;
            },
            this.__hosts?.length || 0
        );

        return respBody;
    };

    sendGetRequestWithResponseHeaders = async <P extends keyof paths>(
        template_path: PathParam<P>,
        params: Record<string, boolean | number | string | undefined>,
        inpHeaders: Record<string, string> | undefined,
        userContext: UserContext
    ): Promise<{ body: ResponseBody<P, "get">; headers: Headers }> => {
        const path = this.getPath(template_path);
        return await this.sendRequestHelper(
            path,
            "GET",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = inpHeaders ?? {};
                headers["cdi-version"] = apiVersion;

                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "get",
                            headers: headers,
                            params: params,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.params !== undefined) {
                        params = request.params;
                    }
                }
                const finalURL = new URL(url);
                const searchParams = new URLSearchParams(
                    Object.entries(params).filter(([_, value]) => value !== undefined) as string[][]
                );
                finalURL.search = searchParams.toString();
                return doFetch(finalURL.toString(), {
                    method: "GET",
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
    };

    // path should start with "/"
    sendPutRequest = async <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "put">,
        params: Record<string, boolean | number | string | undefined>,
        userContext: UserContext
    ): Promise<ResponseBody<P, "put">> => {
        this.invalidateCoreCallCache(userContext);
        const path = this.getPath(template_path);

        const { body: respBody } = await this.sendRequestHelper(
            path,
            "PUT",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = { "cdi-version": apiVersion, "content-type": "application/json; charset=utf-8" };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "put",
                            headers: headers,
                            body: body,
                            params: params,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.body !== undefined) {
                        body = request.body;
                    }
                }

                const finalURL = new URL(url);
                const searchParams = new URLSearchParams(
                    Object.entries(params).filter(([_, value]) => value !== undefined) as string[][]
                );
                finalURL.search = searchParams.toString();

                return doFetch(finalURL.toString(), {
                    method: "PUT",
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
        return respBody;
    };

    // path should start with "/"
    sendPatchRequest = async <P extends keyof paths>(
        template_path: PathParam<P>,
        body: RequestBody<P, "patch">,
        userContext: UserContext
    ): Promise<ResponseBody<P, "patch">> => {
        this.invalidateCoreCallCache(userContext);
        const path = this.getPath(template_path);

        const { body: respBody } = await this.sendRequestHelper(
            path,
            "PATCH",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion(userContext);
                let headers: any = { "cdi-version": apiVersion, "content-type": "application/json; charset=utf-8" };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath() && this.rIdToCore !== undefined) {
                    headers = {
                        ...headers,
                        rid: this.rIdToCore,
                    };
                }
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "patch",
                            headers: headers,
                            body: body,
                        },
                        userContext
                    );
                    url = request.url;
                    headers = request.headers;
                    if (request.body !== undefined) {
                        body = request.body;
                    }
                }

                return doFetch(url, {
                    method: "PATCH",
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
        return respBody;
    };

    invalidateCoreCallCache = (userContext: UserContext, updGlobalCacheTagIfNecessary = true) => {
        if (updGlobalCacheTagIfNecessary && userContext._default?.keepCacheAlive !== true) {
            Querier.globalCacheTag = Date.now();
        }

        userContext._default = {
            ...userContext._default,
            coreCallCache: {},
        };
    };

    public getAllCoreUrlsForPath(path: string) {
        if (this.__hosts === undefined) {
            return [];
        }

        const normalisedPath = new NormalisedURLPath(path);

        return this.__hosts.map((h) => {
            const currentDomain: string = h.domain.getAsStringDangerous();
            const currentBasePath: string = h.basePath.getAsStringDangerous();

            return currentDomain + currentBasePath + normalisedPath.getAsStringDangerous();
        });
    }

    // path should start with "/"
    private sendRequestHelper = async (
        path: NormalisedURLPath,
        method: string,
        requestFunc: (url: string) => Promise<Response>,
        numberOfTries: number,
        retryInfoMap?: Record<string, number>
    ): Promise<any> => {
        if (this.__hosts === undefined) {
            throw Error(
                "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
            );
        }
        if (numberOfTries === 0) {
            throw Error("No SuperTokens core available to query");
        }
        let currentDomain: string = this.__hosts[Querier.lastTriedIndex].domain.getAsStringDangerous();
        let currentBasePath: string = this.__hosts[Querier.lastTriedIndex].basePath.getAsStringDangerous();

        let strPath = path.getAsStringDangerous();

        const url = currentDomain + currentBasePath + strPath;
        const maxRetries = 5;

        if (retryInfoMap === undefined) {
            retryInfoMap = {};
        }

        if (retryInfoMap[url] === undefined) {
            retryInfoMap[url] = maxRetries;
        }

        Querier.lastTriedIndex++;
        Querier.lastTriedIndex = Querier.lastTriedIndex % this.__hosts.length;
        try {
            ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER);
            logDebugMessage(`core-call: ${method} ${url}`);
            let response = await requestFunc(url);
            if (isTestEnv()) {
                Querier.hostsAliveForTesting.add(currentDomain + currentBasePath);
            }

            if (response.status !== 200) {
                throw response;
            }
            if (response.headers.get("content-type")?.startsWith("text")) {
                return { body: await response.clone().text(), headers: response.headers };
            }
            return { body: await response.clone().json(), headers: response.headers };
        } catch (err) {
            if (
                err.message !== undefined &&
                (err.message.includes("Failed to fetch") ||
                    err.message.includes("fetch failed") ||
                    err.message.includes("ECONNREFUSED") ||
                    err.code === "ECONNREFUSED")
            ) {
                return this.sendRequestHelper(path, method, requestFunc, numberOfTries - 1, retryInfoMap);
            }

            if ("status" in err && "text" in err) {
                if (err.status === RATE_LIMIT_STATUS_CODE) {
                    const retriesLeft = retryInfoMap[url];

                    if (retriesLeft > 0) {
                        retryInfoMap[url] = retriesLeft - 1;

                        const attemptsMade = maxRetries - retriesLeft;
                        const delay = 10 + 250 * attemptsMade;

                        await new Promise((resolve) => setTimeout(resolve, delay));

                        return this.sendRequestHelper(path, method, requestFunc, numberOfTries, retryInfoMap);
                    }
                }

                throw new Error(
                    "SuperTokens core threw an error for a " +
                        method +
                        " request to path: '" +
                        path.getAsStringDangerous() +
                        "' with status code: " +
                        err.status +
                        " and message: " +
                        (await err.text())
                );
            }

            throw err;
        }
    };
}
