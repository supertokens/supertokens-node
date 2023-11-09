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
import { doFetch, getLargestVersionFromIntersection } from "./utils";
import { cdiSupported } from "./version";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { PROCESS_STATE, ProcessState } from "./processState";
import { RATE_LIMIT_STATUS_CODE } from "./constants";
import { NetworkInterceptor } from "./types";
import { logDebugMessage } from "./logger";

export class Querier {
    private static initCalled = false;
    private static hosts: { domain: NormalisedURLDomain; basePath: NormalisedURLPath }[] | undefined = undefined;
    private static apiKey: string | undefined = undefined;
    private static apiVersion: string | undefined = undefined;

    private static lastTriedIndex = 0;
    private static hostsAliveForTesting: Set<string> = new Set<string>();

    private static networkInterceptor: NetworkInterceptor | undefined = undefined;

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

    getAPIVersion = async (): Promise<string> => {
        if (Querier.apiVersion !== undefined) {
            return Querier.apiVersion;
        }
        ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION);
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
                let response = await doFetch(url, {
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
        if (process.env.TEST_MODE !== "testing") {
            throw Error("calling testing function in non testing env");
        }
        Querier.initCalled = false;
    }

    getHostsAliveForTesting = () => {
        if (process.env.TEST_MODE !== "testing") {
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
        networkInterceptor?: NetworkInterceptor
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
        }
    }

    // path should start with "/"
    sendPostRequest = async <T = any>(path: NormalisedURLPath, body: any, userContext: any): Promise<T> => {
        const { body: respBody } = await this.sendRequestHelper(
            path,
            "POST",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = {
                    "cdi-version": apiVersion,
                    "content-type": "application/json; charset=utf-8",
                };
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
    sendDeleteRequest = async (path: NormalisedURLPath, body: any, userContext: any, params?: any): Promise<any> => {
        const { body: respBody } = await this.sendRequestHelper(
            path,
            "DELETE",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
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
    sendGetRequest = async (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: any
    ): Promise<any> => {
        const { body: respBody } = await this.sendRequestHelper(
            path,
            "GET",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
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
        return respBody;
    };

    sendGetRequestWithResponseHeaders = async (
        path: NormalisedURLPath,
        params: Record<string, boolean | number | string | undefined>,
        userContext: any
    ): Promise<{ body: any; headers: Headers }> => {
        return await this.sendRequestHelper(
            path,
            "GET",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
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
                if (Querier.networkInterceptor !== undefined) {
                    let request = Querier.networkInterceptor(
                        {
                            url: url,
                            method: "get",
                            headers: headers,
                            params: params,
                            body: undefined,
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
    sendPutRequest = async (path: NormalisedURLPath, body: any, userContext: any): Promise<any> => {
        const { body: respBody } = await this.sendRequestHelper(
            path,
            "PUT",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
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
                            params: undefined,
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
                    method: "PUT",
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    headers,
                });
            },
            this.__hosts?.length || 0
        );
        return respBody;
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
        const url = currentDomain + currentBasePath + path.getAsStringDangerous();
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
            let response = await requestFunc(url);
            if (process.env.TEST_MODE === "testing") {
                Querier.hostsAliveForTesting.add(currentDomain + currentBasePath);
            }
            if (response.status !== 200) {
                throw response;
            }
            if (response.headers.get("content-type")?.startsWith("text")) {
                return { body: await response.text(), headers: response.headers };
            }
            return { body: await response.json(), headers: response.headers };
        } catch (err) {
            if (
                err.message !== undefined &&
                (err.message.includes("Failed to fetch") ||
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
