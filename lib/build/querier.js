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
const error_1 = require("./error");
const normalisedURLPath_1 = require("./normalisedURLPath");
const processState_1 = require("./processState");
const constants_1 = require("./constants");
class Querier {
    // we have rIdToCore so that recipes can force change the rId sent to core. This is a hack until the core is able
    // to support multiple rIds per API
    constructor(hosts, isInServerlessEnv, rIdToCore) {
        this.getAPIVersion = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (Querier.apiVersion !== undefined) {
                    return Querier.apiVersion;
                }
                if (this.isInServerlessEnv) {
                    let apiVersion = yield utils_1.getDataFromFileForServerlessCache(
                        constants_1.SERVERLESS_CACHE_API_VERSION_FILE_PATH
                    );
                    if (apiVersion !== undefined) {
                        Querier.apiVersion = apiVersion;
                        return Querier.apiVersion;
                    }
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
                    this.__hosts.length
                );
                let cdiSupportedByServer = response.versions;
                let supportedVersion = utils_1.getLargestVersionFromIntersection(
                    cdiSupportedByServer,
                    version_1.cdiSupported
                );
                if (supportedVersion === undefined) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error(
                            "The running SuperTokens core version is not compatible with this NodeJS SDK. Please visit https://supertokens.io/docs/community/compatibility to find the right versions"
                        ),
                    });
                }
                Querier.apiVersion = supportedVersion;
                if (this.isInServerlessEnv) {
                    utils_1.storeIntoTempFolderForServerlessCache(
                        constants_1.SERVERLESS_CACHE_API_VERSION_FILE_PATH,
                        supportedVersion
                    );
                }
                return Querier.apiVersion;
            });
        this.getHostsAliveForTesting = () => {
            if (process.env.TEST_MODE !== "testing") {
                throw new error_1.default({
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                });
            }
            return Querier.hostsAliveForTesting;
        };
        // path should start with "/"
        this.sendPostRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.sendRequestHelper(
                    path,
                    "POST",
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
                            return yield axios_1.default({
                                method: "POST",
                                url,
                                data: body,
                                headers,
                            });
                        }),
                    this.__hosts.length
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
                            if (Querier.apiKey !== undefined) {
                                headers = Object.assign(Object.assign({}, headers), { "api-key": Querier.apiKey });
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
                    this.__hosts.length
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
                    this.__hosts.length
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
                    this.__hosts.length
                );
            });
        // path should start with "/"
        this.sendRequestHelper = (path, method, axiosFunction, numberOfTries) =>
            __awaiter(this, void 0, void 0, function* () {
                if (numberOfTries === 0) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("No SuperTokens core available to query"),
                    });
                }
                let currentHost = this.__hosts[Querier.lastTriedIndex].getAsStringDangerous();
                Querier.lastTriedIndex++;
                Querier.lastTriedIndex = Querier.lastTriedIndex % this.__hosts.length;
                try {
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER
                    );
                    let response = yield axiosFunction(currentHost + path.getAsStringDangerous());
                    if (process.env.TEST_MODE === "testing") {
                        Querier.hostsAliveForTesting.add(currentHost);
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
                        throw new error_1.default({
                            type: error_1.default.GENERAL_ERROR,
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
                        throw new error_1.default({
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        });
                    }
                }
            });
        this.__hosts = hosts;
        this.rIdToCore = rIdToCore;
        this.isInServerlessEnv = isInServerlessEnv;
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        Querier.initCalled = false;
    }
    static getNewInstanceOrThrowError(isInServerlessEnv, rIdToCore) {
        if (!Querier.initCalled || Querier.hosts === undefined) {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Please call the supertokens.init function before using SuperTokens"),
            });
        }
        return new Querier(Querier.hosts, isInServerlessEnv, rIdToCore);
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
//# sourceMappingURL=querier.js.map
