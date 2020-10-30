/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import axios from "axios";

import { getLargestVersionFromIntersection } from "./utils";
import { cdiSupported } from "./version";
import STError from "./error";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { PROCESS_STATE, ProcessState } from "./processState";

export class Querier {
    private static initCalled = false;
    private static hosts: NormalisedURLDomain[] | undefined = undefined;
    private static apiKey: string | undefined = undefined;
    private static apiVersion: string | undefined = undefined;

    private static lastTriedIndex = 0;
    private static hostsAliveForTesting: Set<string> = new Set<string>();

    private __hosts: NormalisedURLDomain[];
    private rId: string;

    private constructor(hosts: NormalisedURLDomain[], rId: string) {
        this.__hosts = hosts;
        this.rId = rId;
    }

    getAPIVersion = async (): Promise<string> => {
        if (Querier.apiVersion !== undefined) {
            return Querier.apiVersion;
        }
        let response = await this.sendRequestHelper(
            new NormalisedURLPath(this.rId, "/apiversion"),
            "GET",
            (url: string) => {
                let headers: any = {};
                if (Querier.apiKey !== undefined) {
                    headers = {
                        "api-key": Querier.apiKey,
                    };
                }
                return axios.get(url, {
                    headers,
                });
            },
            this.__hosts.length
        );
        let cdiSupportedByServer: string[] = response.versions;
        let supportedVersion = getLargestVersionFromIntersection(cdiSupportedByServer, cdiSupported);
        if (supportedVersion === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: this.rId,
                payload: new Error(
                    "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
                ),
            });
        }
        ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION);
        Querier.apiVersion = supportedVersion;
        return Querier.apiVersion;
    };

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: "",
                payload: new Error("calling testing function in non testing env"),
            });
        }
        Querier.initCalled = false;
    }

    getHostsAliveForTesting = () => {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: this.rId,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        return Querier.hostsAliveForTesting;
    };

    static getInstanceOrThrowError(rId: string): Querier {
        if (!Querier.initCalled || Querier.hosts === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId,
                payload: new Error("Please call the supertokens.init function before using SuperTokens"),
            });
        }
        return new Querier(Querier.hosts, rId);
    }

    static init(hosts: NormalisedURLDomain[], apiKey?: string) {
        if (!Querier.initCalled) {
            Querier.initCalled = true;
            Querier.hosts = hosts;
            Querier.apiKey = apiKey;
            Querier.apiVersion = undefined;
            Querier.lastTriedIndex = 0;
            Querier.hostsAliveForTesting = new Set<string>();
        }
    }

    // path should start with "/"
    sendPostRequest = async (path: NormalisedURLPath, body: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "POST",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath()) {
                    headers = {
                        ...headers,
                        rid: this.rId,
                    };
                }
                return await axios({
                    method: "POST",
                    url,
                    data: body,
                    headers,
                });
            },
            this.__hosts.length
        );
    };

    // path should start with "/"
    sendDeleteRequest = async (path: NormalisedURLPath, body: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "DELETE",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath()) {
                    headers = {
                        ...headers,
                        rid: this.rId,
                    };
                }
                return await axios({
                    method: "DELETE",
                    url,
                    data: body,
                    headers,
                });
            },
            this.__hosts.length
        );
    };

    // path should start with "/"
    sendGetRequest = async (path: NormalisedURLPath, params: any): Promise<any> => {
        return this.sendRequestHelper(
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
                if (path.isARecipePath()) {
                    headers = {
                        ...headers,
                        rid: this.rId,
                    };
                }
                return await axios.get(url, {
                    params,
                    headers,
                });
            },
            this.__hosts.length
        );
    };

    // path should start with "/"
    sendPutRequest = async (path: NormalisedURLPath, body: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "PUT",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (Querier.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": Querier.apiKey,
                    };
                }
                if (path.isARecipePath()) {
                    headers = {
                        ...headers,
                        rid: this.rId,
                    };
                }
                return await axios({
                    method: "PUT",
                    url,
                    data: body,
                    headers,
                });
            },
            this.__hosts.length
        );
    };

    // path should start with "/"
    private sendRequestHelper = async (
        path: NormalisedURLPath,
        method: string,
        axiosFunction: (url: string) => Promise<any>,
        numberOfTries: number
    ): Promise<any> => {
        if (numberOfTries == 0) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: this.rId,
                payload: new Error("No SuperTokens core available to query"),
            });
        }
        let currentHost: string = this.__hosts[Querier.lastTriedIndex].getAsStringDangerous();
        Querier.lastTriedIndex++;
        Querier.lastTriedIndex = Querier.lastTriedIndex % this.__hosts.length;
        try {
            let response = await axiosFunction(currentHost + path.getAsStringDangerous());
            if (process.env.TEST_MODE === "testing") {
                Querier.hostsAliveForTesting.add(currentHost);
            }
            if (response.status !== 200) {
                throw response;
            }
            return response.data;
        } catch (err) {
            if (err.message !== undefined && err.message.includes("ECONNREFUSED")) {
                return await this.sendRequestHelper(path, method, axiosFunction, numberOfTries - 1);
            }
            if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
                throw new STError({
                    type: STError.GENERAL_ERROR,
                    rId: this.rId,
                    payload: new Error(
                        "SuperTokens core threw an error for a " +
                            method +
                            " request to path: '" +
                            path.getAsStringDangerous() +
                            "' with status code: " +
                            err.response.status +
                            " and message: " +
                            err.response.data
                    ),
                });
            } else {
                throw new STError({
                    type: STError.GENERAL_ERROR,
                    rId: this.rId,
                    payload: err,
                });
            }
        }
    };
}
