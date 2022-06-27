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
const axios_1 = require("axios");
const utils_1 = require("./utils");
const version_1 = require("./version");
const normalisedURLPath_1 = require("./normalisedURLPath");
const processState_1 = require("./processState");
class Querier {
    // we have rIdToCore so that recipes can force change the rId sent to core. This is a hack until the core is able
    // to support multiple rIds per API
    constructor(hosts, rIdToCore) {
        this.getAPIVersion = () =>
            __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (Querier.apiVersion !== undefined) {
                    return Querier.apiVersion;
                }
                processState_1.ProcessState.getInstance().addState(
                    processState_1.PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION
                );
                let response = yield this.sendRequestHelper(
                    new normalisedURLPath_1.default("/apiversion"),
                    "GET",
                    (url) => {
                        let headers = {};
                        if (Querier.apiKey !== undefined) {
                            headers = {
                                "api-key": Querier.apiKey,
                            };
                        }
                        return axios_1.default.get(url, {
                            headers,
                        });
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
            });
        this.getHostsAliveForTesting = () => {
            if (process.env.TEST_MODE !== "testing") {
                throw Error("calling testing function in non testing env");
            }
            return Querier.hostsAliveForTesting;
        };
        // path should start with "/"
        this.sendPostRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                var _b;
                return this.sendRequestHelper(
                    path,
                    "POST",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
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
                            return yield axios_1.default({
                                method: "POST",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    ((_b = this.__hosts) === null || _b === void 0 ? void 0 : _b.length) || 0
                );
            });
        // path should start with "/"
        this.sendDeleteRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                var _c;
                return this.sendRequestHelper(
                    path,
                    "DELETE",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (Querier.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), {
                                    "api-key": Querier.apiKey,
                                    "content-type": "application/json; charset=utf-8",
                                });
                            }
                            if (path.isARecipePath() && this.rIdToCore !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
                            }
                            return yield axios_1.default({
                                method: "DELETE",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    ((_c = this.__hosts) === null || _c === void 0 ? void 0 : _c.length) || 0
                );
            });
        // path should start with "/"
        this.sendGetRequest = (path, params) =>
            __awaiter(this, void 0, void 0, function* () {
                var _d;
                return this.sendRequestHelper(
                    path,
                    "GET",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
                            let headers = { "cdi-version": apiVersion };
                            if (Querier.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
                            }
                            if (path.isARecipePath() && this.rIdToCore !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { rid: this.rIdToCore });
                            }
                            return yield axios_1.default.get(url, {
                                params,
                                headers,
                            });
                        }),
                    ((_d = this.__hosts) === null || _d === void 0 ? void 0 : _d.length) || 0
                );
            });
        // path should start with "/"
        this.sendPutRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                var _e;
                return this.sendRequestHelper(
                    path,
                    "PUT",
                    (url) =>
                        __awaiter(this, void 0, void 0, function* () {
                            let apiVersion = yield this.getAPIVersion();
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
                            return yield axios_1.default({
                                method: "PUT",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    ((_e = this.__hosts) === null || _e === void 0 ? void 0 : _e.length) || 0
                );
            });
        // path should start with "/"
        this.sendRequestHelper = (path, method, axiosFunction, numberOfTries) =>
            __awaiter(this, void 0, void 0, function* () {
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
                Querier.lastTriedIndex++;
                Querier.lastTriedIndex = Querier.lastTriedIndex % this.__hosts.length;
                try {
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER
                    );
                    let response = yield axiosFunction(currentDomain + currentBasePath + path.getAsStringDangerous());
                    if (process.env.TEST_MODE === "testing") {
                        Querier.hostsAliveForTesting.add(currentDomain + currentBasePath);
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
                        throw new Error(
                            "SuperTokens core threw an error for a " +
                                method +
                                " request to path: '" +
                                path.getAsStringDangerous() +
                                "' with status code: " +
                                err.response.status +
                                " and message: " +
                                err.response.data
                        );
                    } else {
                        throw err;
                    }
                }
            });
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
    static init(hosts, apiKey) {
        if (!Querier.initCalled) {
            Querier.initCalled = true;
            Querier.hosts = hosts;
            Querier.apiKey = apiKey;
            Querier.apiVersion = undefined;
            Querier.lastTriedIndex = 0;
            Querier.hostsAliveForTesting = new Set();
        }
    }
}
exports.Querier = Querier;
Querier.initCalled = false;
Querier.hosts = undefined;
Querier.apiKey = undefined;
Querier.apiVersion = undefined;
Querier.lastTriedIndex = 0;
Querier.hostsAliveForTesting = new Set();
