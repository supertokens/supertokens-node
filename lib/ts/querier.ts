import axios from "axios";

import { DeviceInfo } from "./deviceInfo";
import { AuthError, generateError } from "./error";
import { TypeInput } from "./types";
import { version } from "./version";

export class Querier {
    static instance: Querier | undefined;
    private hosts: TypeInput = [];
    private lastTriedIndex = 0;

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
        return this.sendPostRequestHelper(path, body, this.hosts.length);
    };

    // path should start with "/"
    private sendPostRequestHelper = async (path: string, body: any, numberOfTries: number): Promise<any> => {
        if (numberOfTries == 0) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("no SuperTokens core available to query"));
        }
        let currentHost = this.hosts[this.lastTriedIndex];
        this.lastTriedIndex++;
        this.lastTriedIndex = this.lastTriedIndex % this.hosts.length;
        try {
            let response = await axios.post("http://" + currentHost.hostname + ":" + currentHost.port + path, body);
            if (response.status !== 200) {
                throw response;
            }
            return response.data;
        } catch (err) {
            if (err.message !== undefined && err.message.includes("ECONNREFUSED")) {
                return await this.sendPostRequestHelper(path, body, numberOfTries - 1);
            }
            if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error(
                        "SuperTokens core threw an error for a POST request to path: '" +
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
