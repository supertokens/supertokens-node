"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Querier = void 0;
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
const utils_1 = require("./utils");
const version_1 = require("./version");
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const processState_1 = require("./processState");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
class Querier {
    // we have rIdToCore so that recipes can force change the rId sent to core. This is a hack until the core is able
    // to support multiple rIds per API
    constructor(hosts, rIdToCore) {
        this.getAPIVersion = async () => {
            var _a;
            if (Querier.apiVersion !== undefined) {
                return Querier.apiVersion;
            }
            processState_1.ProcessState.getInstance().addState(
                processState_1.PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION
            );
            let { body: response } = await this.sendRequestHelper(
                new normalisedURLPath_1.default("/apiversion"),
                "GET",
                async (url) => {
                    let headers = {};
                    if (Querier.apiKey !== undefined) {
                        headers = {
                            "api-key": Querier.apiKey,
                        };
                    }
                    let response = await utils_1.doFetch(url, {
                        method: "GET",
                        headers,
                    });
                    return response;
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
            let cdiSupportedByServer = response.versions;
            let supportedVersion = utils_1.getLargestVersionFromIntersection(
                cdiSupportedByServer,
                version_1.cdiSupported
            );
            if (supportedVersion === undefined) {
                throw Error(
                    "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
                );
            }
            Querier.apiVersion = supportedVersion;
            return Querier.apiVersion;
        };
        this.getHostsAliveForTesting = () => {
            if (process.env.TEST_MODE !== "testing") {
                throw Error("calling testing function in non testing env");
            }
            return Querier.hostsAliveForTesting;
        };
        // path should start with "/"
        this.sendPostRequest = async (path, body, userContext) => {
            var _a;
            this.invalidateCoreCallCache(userContext);
            const { body: respBody } = await this.sendRequestHelper(
                path,
                "POST",
                async (url) => {
                    let apiVersion = await this.getAPIVersion();
                    let headers = {
                        "cdi-version": apiVersion,
                        "content-type": "application/json; charset=utf-8",
                    };
                    if (Querier.apiKey !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                    }
                    if (path.isARecipePath() && this.rIdToCore !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
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
                    return utils_1.doFetch(url, {
                        method: "POST",
                        body: body !== undefined ? JSON.stringify(body) : undefined,
                        headers,
                    });
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
            return respBody;
        };
        // path should start with "/"
        this.sendDeleteRequest = async (path, body, params, userContext) => {
            var _a;
            this.invalidateCoreCallCache(userContext);
            const { body: respBody } = await this.sendRequestHelper(
                path,
                "DELETE",
                async (url) => {
                    let apiVersion = await this.getAPIVersion();
                    let headers = { "cdi-version": apiVersion, "content-type": "application/json; charset=utf-8" };
                    if (Querier.apiKey !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                    }
                    if (path.isARecipePath() && this.rIdToCore !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
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
                    return utils_1.doFetch(finalURL.toString(), {
                        method: "DELETE",
                        body: body !== undefined ? JSON.stringify(body) : undefined,
                        headers,
                    });
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
            return respBody;
        };
        // path should start with "/"
        this.sendGetRequest = async (path, params, userContext) => {
            var _a;
            const { body: respBody } = await this.sendRequestHelper(
                path,
                "GET",
                async (url) => {
                    var _a, _b, _c, _d;
                    let apiVersion = await this.getAPIVersion();
                    let headers = { "cdi-version": apiVersion };
                    if (Querier.apiKey !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                    }
                    if (path.isARecipePath() && this.rIdToCore !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
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
                    if (
                        ((_a = userContext._default) === null || _a === void 0 ? void 0 : _a.globalCacheTag) !==
                        Querier.globalCacheTag
                    ) {
                        this.invalidateCoreCallCache(userContext, false);
                    }
                    if (
                        !Querier.disableCache &&
                        uniqueKey in
                            ((_c =
                                (_b = userContext._default) === null || _b === void 0 ? void 0 : _b.coreCallCache) !==
                                null && _c !== void 0
                                ? _c
                                : {})
                    ) {
                        return userContext._default.coreCallCache[uniqueKey];
                    }
                    /* CACHE CHECK END */
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
                        Object.entries(params).filter(([_, value]) => value !== undefined)
                    );
                    finalURL.search = searchParams.toString();
                    // Update cache and return
                    let response = await utils_1.doFetch(finalURL.toString(), {
                        method: "GET",
                        headers,
                    });
                    if (response.status === 200 && !Querier.disableCache) {
                        // If the request was successful, we save the result into the cache
                        // plus we update the cache tag
                        userContext._default = Object.assign(Object.assign({}, userContext._default), {
                            coreCallCache: Object.assign(
                                Object.assign(
                                    {},
                                    (_d = userContext._default) === null || _d === void 0 ? void 0 : _d.coreCallCache
                                ),
                                { [uniqueKey]: response }
                            ),
                            globalCacheTag: Querier.globalCacheTag,
                        });
                    }
                    return response;
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
            return respBody;
        };
        this.sendGetRequestWithResponseHeaders = async (path, params, userContext) => {
            var _a;
            return await this.sendRequestHelper(
                path,
                "GET",
                async (url) => {
                    let apiVersion = await this.getAPIVersion();
                    let headers = { "cdi-version": apiVersion };
                    if (Querier.apiKey !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                    }
                    if (path.isARecipePath() && this.rIdToCore !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
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
                        Object.entries(params).filter(([_, value]) => value !== undefined)
                    );
                    finalURL.search = searchParams.toString();
                    return utils_1.doFetch(finalURL.toString(), {
                        method: "GET",
                        headers,
                    });
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
        };
        // path should start with "/"
        this.sendPutRequest = async (path, body, userContext) => {
            var _a;
            this.invalidateCoreCallCache(userContext);
            const { body: respBody } = await this.sendRequestHelper(
                path,
                "PUT",
                async (url) => {
                    let apiVersion = await this.getAPIVersion();
                    let headers = { "cdi-version": apiVersion, "content-type": "application/json; charset=utf-8" };
                    if (Querier.apiKey !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                    }
                    if (path.isARecipePath() && this.rIdToCore !== undefined) {
                        headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
                    }
                    if (Querier.networkInterceptor !== undefined) {
                        let request = Querier.networkInterceptor(
                            {
                                url: url,
                                method: "put",
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
                    return utils_1.doFetch(url, {
                        method: "PUT",
                        body: body !== undefined ? JSON.stringify(body) : undefined,
                        headers,
                    });
                },
                ((_a = this.__hosts) === null || _a === void 0 ? void 0 : _a.length) || 0
            );
            return respBody;
        };
        this.invalidateCoreCallCache = (userContext, updGlobalCacheTagIfNecessary = true) => {
            var _a;
            if (
                updGlobalCacheTagIfNecessary &&
                ((_a = userContext._default) === null || _a === void 0 ? void 0 : _a.keepCacheAlive) !== true
            ) {
                Querier.globalCacheTag = Date.now();
            }
            userContext._default = Object.assign(Object.assign({}, userContext._default), { coreCallCache: {} });
        };
        // path should start with "/"
        this.sendRequestHelper = async (path, method, requestFunc, numberOfTries, retryInfoMap) => {
            var _a;
            if (this.__hosts === undefined) {
                throw Error(
                    "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
                );
            }
            if (numberOfTries === 0) {
                throw Error("No SuperTokens core available to query");
            }
            let currentDomain = this.__hosts[Querier.lastTriedIndex].domain.getAsStringDangerous();
            let currentBasePath = this.__hosts[Querier.lastTriedIndex].basePath.getAsStringDangerous();
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
                processState_1.ProcessState.getInstance().addState(
                    processState_1.PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER
                );
                logger_1.logDebugMessage(`core-call: ${method} ${url}`);
                let response = await requestFunc(url);
                if (process.env.TEST_MODE === "testing") {
                    Querier.hostsAliveForTesting.add(currentDomain + currentBasePath);
                }
                if (response.status !== 200) {
                    throw response;
                }
                if (
                    (_a = response.headers.get("content-type")) === null || _a === void 0
                        ? void 0
                        : _a.startsWith("text")
                ) {
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
                    if (err.status === constants_1.RATE_LIMIT_STATUS_CODE) {
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
        this.__hosts = hosts;
        this.rIdToCore = rIdToCore;
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("calling testing function in non testing env");
        }
        Querier.initCalled = false;
    }
    static getNewInstanceOrThrowError(rIdToCore) {
        if (!Querier.initCalled) {
            throw Error("Please call the supertokens.init function before using SuperTokens");
        }
        return new Querier(Querier.hosts, rIdToCore);
    }
    static init(hosts, apiKey, networkInterceptor, disableCache) {
        if (!Querier.initCalled) {
            logger_1.logDebugMessage("querier initialized");
            Querier.initCalled = true;
            Querier.hosts = hosts;
            Querier.apiKey = apiKey;
            Querier.apiVersion = undefined;
            Querier.lastTriedIndex = 0;
            Querier.hostsAliveForTesting = new Set();
            Querier.networkInterceptor = networkInterceptor;
            Querier.disableCache = disableCache !== null && disableCache !== void 0 ? disableCache : false;
        }
    }
    getAllCoreUrlsForPath(path) {
        if (this.__hosts === undefined) {
            return [];
        }
        const normalisedPath = new normalisedURLPath_1.default(path);
        return this.__hosts.map((h) => {
            const currentDomain = h.domain.getAsStringDangerous();
            const currentBasePath = h.basePath.getAsStringDangerous();
            return currentDomain + currentBasePath + normalisedPath.getAsStringDangerous();
        });
    }
}
exports.Querier = Querier;
Querier.initCalled = false;
Querier.hosts = undefined;
Querier.apiKey = undefined;
Querier.apiVersion = undefined;
Querier.lastTriedIndex = 0;
Querier.hostsAliveForTesting = new Set();
Querier.networkInterceptor = undefined;
Querier.globalCacheTag = Date.now();
Querier.disableCache = false;
