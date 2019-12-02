import axios from "axios";

import { DeviceInfo } from "./deviceInfo";
import { AuthError, generateError } from "./error";
import { TypeInput } from "./types";
import { version } from "./version";

export class Querier {
    static instance: Querier | undefined;
    private hosts: TypeInput = [];
    private lastTriedIndex = 0;
    private hostsAliveForTesting: Set<string> = new Set<string>();

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

    static getInstance(): Querier {
        if (Querier.instance == undefined) {
            Querier.instance = new Querier();
        }
        if (Querier.instance.hosts.length == 0) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using any other functions of the SuperTokens library")
            );
        }
        return Querier.instance;
    }

    static initInstance(hosts: TypeInput) {
        if (Querier.instance == undefined) {
            if (hosts.length == 0) {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error("Please provide at least one SuperTokens' core address")
                );
            }
            Querier.instance = new Querier();
            Querier.instance.hosts = hosts;
        }
    }

    // path should start with "/"
    sendPostRequest = async (path: string, body: any): Promise<any> => {
        if (path == "/session" || path == "/session/verify" || path == "/session/refresh" || path == "/handshake") {
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
                    version
                }
            };
            body = {
                ...body,
                deviceDriverInfo
            };
        }
        return this.sendRequestHelper(
            path,
            "POST",
            (url: string) => {
                return axios({
                    method: "POST",
                    url,
                    data: body
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
            (url: string) => {
                return axios({
                    method: "DELETE",
                    url,
                    data: body
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
            (url: string) => {
                return axios.get(url, {
                    params
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
            (url: string) => {
                return axios({
                    method: "PUT",
                    url,
                    data: body
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
            let response = await axiosFunction("http://" + currentHost.hostname + ":" + currentHost.port + path);
            if (process.env.TEST_MODE === "testing") {
                this.hostsAliveForTesting.add(currentHost.hostname + ":" + currentHost.port);
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
