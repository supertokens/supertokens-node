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

import { DeviceInfo } from "./deviceInfo";
import { AuthError, generateError } from "./error";
import { TypeInput } from "./types";
import { version } from "./version";
import { getLargestVersionFromIntersection } from "./utils";
import { cdiSupported } from "./version";
import { normaliseURLDomainOrThrowError } from "./utils";

export class Querier {
    static instance: Querier | undefined;
    private hosts: string[];
    private lastTriedIndex = 0;
    private hostsAliveForTesting: Set<string> = new Set<string>();
    private apiVersion: string | undefined = undefined;
    private apiKey: string | undefined = undefined;

    private constructor(hosts: string, apiKey?: string) {
        this.hosts = hosts.split(";").map((h) => normaliseURLDomainOrThrowError(h));
        this.apiKey = apiKey;
    }

    getAPIVersion = async (): Promise<string> => {
        if (this.apiVersion !== undefined) {
            return this.apiVersion;
        }
        let response = await this.sendRequestHelper(
            "/apiversion",
            "GET",
            (url: string) => {
                let headers: any = {};
                if (this.apiKey !== undefined) {
                    headers = {
                        "api-key": this.apiKey,
                    };
                }
                return axios.get(url, {
                    headers,
                });
            },
            this.hosts.length
        );
        let cdiSupportedByServer: string[] = response.versions;
        let supportedVersion = getLargestVersionFromIntersection(cdiSupportedByServer, cdiSupported);
        if (supportedVersion === undefined) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error(
                    "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
                )
            );
        }
        this.apiVersion = supportedVersion;
        return this.apiVersion;
    };

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw generateError(AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        Querier.instance = undefined;
    }

    getHostsAliveForTesting = () => {
        if (process.env.TEST_MODE !== "testing") {
            throw generateError(AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        return this.hostsAliveForTesting;
    };

    static getInstanceOrThrowError(): Querier {
        if (Querier.instance === undefined) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using SuperTokens")
            );
        }
        return Querier.instance;
    }

    static initInstance(hosts: string, apiKey?: string) {
        if (Querier.instance === undefined) {
            Querier.instance = new Querier(hosts, apiKey);
        }
    }

    // path should start with "/"
    sendPostRequest = async (path: string, body: any): Promise<any> => {
        if (path === "/session" || path === "/session/verify" || path === "/session/refresh" || path === "/handshake") {
            let deviceDriverInfo: {
                frontendSDK: {
                    name: string;
                    version: string;
                }[];
                driver: {
                    name: string;
                    version: string;
                };
            } = {
                frontendSDK: DeviceInfo.getInstance().getFrontendSDKs(),
                driver: {
                    name: "node",
                    version,
                },
            };
            body = {
                ...body,
                deviceDriverInfo,
            };
        }
        return this.sendRequestHelper(
            path,
            "POST",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (this.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": this.apiKey,
                    };
                }
                return await axios({
                    method: "POST",
                    url,
                    data: body,
                    headers,
                });
            },
            this.hosts.length
        );
    };

    // path should start with "/"
    sendDeleteRequest = async (path: string, body: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "DELETE",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (this.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": this.apiKey,
                    };
                }
                return await axios({
                    method: "DELETE",
                    url,
                    data: body,
                    headers,
                });
            },
            this.hosts.length
        );
    };

    // path should start with "/"
    sendGetRequest = async (path: string, params: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "GET",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (this.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": this.apiKey,
                    };
                }
                return await axios.get(url, {
                    params,
                    headers,
                });
            },
            this.hosts.length
        );
    };

    // path should start with "/"
    sendPutRequest = async (path: string, body: any): Promise<any> => {
        return this.sendRequestHelper(
            path,
            "PUT",
            async (url: string) => {
                let apiVersion = await this.getAPIVersion();
                let headers: any = { "cdi-version": apiVersion };
                if (this.apiKey !== undefined) {
                    headers = {
                        ...headers,
                        "api-key": this.apiKey,
                    };
                }
                return await axios({
                    method: "PUT",
                    url,
                    data: body,
                    headers,
                });
            },
            this.hosts.length
        );
    };

    // path should start with "/"
    private sendRequestHelper = async (
        path: string,
        method: string,
        axiosFunction: (url: string) => Promise<any>,
        numberOfTries: number
    ): Promise<any> => {
        if (numberOfTries == 0) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("No SuperTokens core available to query"));
        }
        let currentHost = this.hosts[this.lastTriedIndex];
        this.lastTriedIndex++;
        this.lastTriedIndex = this.lastTriedIndex % this.hosts.length;
        try {
            let response = await axiosFunction(currentHost + path);
            if (process.env.TEST_MODE === "testing") {
                this.hostsAliveForTesting.add(currentHost);
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
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error(
                        "SuperTokens core threw an error for a " +
                            method +
                            " request to path: '" +
                            path +
                            "' with status code: " +
                            err.response.status +
                            " and message: " +
                            err.response.data
                    )
                );
            } else {
                throw generateError(AuthError.GENERAL_ERROR, err);
            }
        }
    };
}
