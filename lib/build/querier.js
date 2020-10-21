"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
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
const axios_1 = require("axios");
const deviceInfo_1 = require("./deviceInfo");
const error_1 = require("./error");
const version_1 = require("./version");
const utils_1 = require("./utils");
const version_2 = require("./version");
const utils_2 = require("./utils");
class Querier {
    constructor(hosts, apiKey) {
        this.lastTriedIndex = 0;
        this.hostsAliveForTesting = new Set();
        this.apiVersion = undefined;
        this.apiKey = undefined;
        this.getAPIVersion = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.apiVersion !== undefined) {
                    return this.apiVersion;
                }
                let response = yield this.sendRequestHelper(
                    "/apiversion",
                    "GET",
                    (url) => {
                        let headers = {};
                        if (this.apiKey !== undefined) {
                            headers = {
                                "api-key": this.apiKey,
                            };
                        }
                        return axios_1.default.get(url, {
                            headers,
                        });
                    },
                    this.hosts.length
                );
                let cdiSupportedByServer = response.versions;
                let supportedVersion = utils_1.getLargestVersionFromIntersection(
                    cdiSupportedByServer,
                    version_2.cdiSupported
                );
                if (supportedVersion === undefined) {
                    throw error_1.generateError(
                        error_1.AuthError.GENERAL_ERROR,
                        new Error(
                            "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
                        )
                    );
                }
                this.apiVersion = supportedVersion;
                return this.apiVersion;
            });
        this.getHostsAliveForTesting = () => {
            if (process.env.TEST_MODE !== "testing") {
                throw error_1.generateError(
                    error_1.AuthError.GENERAL_ERROR,
                    new Error("calling testing function in non testing env")
                );
            }
            return this.hostsAliveForTesting;
        };
        // path should start with "/"
        this.sendPostRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                if (
                    path === "/session" ||
                    path === "/session/verify" ||
                    path === "/session/refresh" ||
                    path === "/handshake"
                ) {
                    let deviceDriverInfo = {
                        frontendSDK: deviceInfo_1.DeviceInfo.getInstance().getFrontendSDKs(),
                        driver: {
                            name: "node",
                            version: version_1.version,
                        },
                    };
                    body = Object.assign(Object.assign({}, body), { deviceDriverInfo });
                }
                return this.sendRequestHelper(
                    path,
                    "POST",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (this.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": this.apiKey });
                            }
                            return yield axios_1.default({
                                method: "POST",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendDeleteRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.sendRequestHelper(
                    path,
                    "DELETE",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (this.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": this.apiKey });
                            }
                            return yield axios_1.default({
                                method: "DELETE",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendGetRequest = (path, params) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.sendRequestHelper(
                    path,
                    "GET",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (this.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": this.apiKey });
                            }
                            return yield axios_1.default.get(url, {
                                params,
                                headers,
                            });
                        }),
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendPutRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.sendRequestHelper(
                    path,
                    "PUT",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (this.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": this.apiKey });
                            }
                            return yield axios_1.default({
                                method: "PUT",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendRequestHelper = (path, method, axiosFunction, numberOfTries) =>
            __awaiter(this, void 0, void 0, function* () {
                if (numberOfTries == 0) {
                    throw error_1.generateError(
                        error_1.AuthError.GENERAL_ERROR,
                        new Error("No SuperTokens core available to query")
                    );
                }
                let currentHost = this.hosts[this.lastTriedIndex];
                this.lastTriedIndex++;
                this.lastTriedIndex = this.lastTriedIndex % this.hosts.length;
                try {
                    let response = yield axiosFunction(currentHost + path);
                    if (process.env.TEST_MODE === "testing") {
                        this.hostsAliveForTesting.add(currentHost);
                    }
                    if (response.status !== 200) {
                        throw response;
                    }
                    return response.data;
                } catch (err) {
                    if (err.message !== undefined && err.message.includes("ECONNREFUSED")) {
                        return yield this.sendRequestHelper(path, method, axiosFunction, numberOfTries - 1);
                    }
                    if (
                        err.response !== undefined &&
                        err.response.status !== undefined &&
                        err.response.data !== undefined
                    ) {
                        throw error_1.generateError(
                            error_1.AuthError.GENERAL_ERROR,
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
                        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
                    }
                }
            });
        this.hosts = hosts.split(";").map((h) => utils_2.normaliseURLDomainOrThrowError(h));
        this.apiKey = apiKey;
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw error_1.generateError(
                error_1.AuthError.GENERAL_ERROR,
                new Error("calling testing function in non testing env")
            );
        }
        Querier.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (Querier.instance === undefined) {
            throw error_1.generateError(
                error_1.AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using SuperTokens")
            );
        }
        return Querier.instance;
    }
    static initInstance(hosts, apiKey) {
        if (Querier.instance === undefined) {
            Querier.instance = new Querier(hosts, apiKey);
        }
    }
}
exports.Querier = Querier;
//# sourceMappingURL=querier.js.map
