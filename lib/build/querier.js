"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
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
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const deviceInfo_1 = require("./deviceInfo");
const error_1 = require("./error");
const version_1 = require("./version");
class Querier {
    constructor() {
        this.hosts = [];
        this.lastTriedIndex = 0;
        this.hostsAliveForTesting = new Set();
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
            __awaiter(this, void 0, void 0, function*() {
                if (
                    path == "/session" ||
                    path == "/session/verify" ||
                    path == "/session/refresh" ||
                    path == "/handshake"
                ) {
                    let deviceDriverInfo = {
                        frontendSDK: deviceInfo_1.DeviceInfo.getInstance().getFrontendSDKs(),
                        driver: {
                            name: "node",
                            version: version_1.version
                        }
                    };
                    body = Object.assign({}, body, { deviceDriverInfo });
                }
                return this.sendRequestHelper(
                    path,
                    "POST",
                    url => {
                        return axios_1.default({
                            method: "POST",
                            url,
                            data: body
                        });
                    },
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendDeleteRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function*() {
                return this.sendRequestHelper(
                    path,
                    "DELETE",
                    url => {
                        return axios_1.default({
                            method: "DELETE",
                            url,
                            data: body
                        });
                    },
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendGetRequest = (path, params) =>
            __awaiter(this, void 0, void 0, function*() {
                return this.sendRequestHelper(
                    path,
                    "GET",
                    url => {
                        return axios_1.default.get(url, {
                            params
                        });
                    },
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendPutRequest = (path, body) =>
            __awaiter(this, void 0, void 0, function*() {
                return this.sendRequestHelper(
                    path,
                    "PUT",
                    url => {
                        return axios_1.default({
                            method: "PUT",
                            url,
                            data: body
                        });
                    },
                    this.hosts.length
                );
            });
        // path should start with "/"
        this.sendRequestHelper = (path, method, axiosFunction, numberOfTries) =>
            __awaiter(this, void 0, void 0, function*() {
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
                    let response = yield axiosFunction(
                        "http://" + currentHost.hostname + ":" + currentHost.port + path
                    );
                    if (process.env.TEST_MODE === "testing") {
                        this.hostsAliveForTesting.add(currentHost.hostname + ":" + currentHost.port);
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
    static getInstance() {
        if (Querier.instance == undefined) {
            Querier.instance = new Querier();
        }
        if (Querier.instance.hosts.length == 0) {
            Querier.instance = undefined;
            throw error_1.generateError(
                error_1.AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using any other functions of the SuperTokens library")
            );
        }
        return Querier.instance;
    }
    static initInstance(hosts) {
        if (Querier.instance == undefined) {
            if (hosts.length == 0) {
                throw error_1.generateError(
                    error_1.AuthError.GENERAL_ERROR,
                    new Error("Please provide at least one SuperTokens' core address")
                );
            }
            Querier.instance = new Querier();
            Querier.instance.hosts = hosts;
        }
    }
}
exports.Querier = Querier;
//# sourceMappingURL=querier.js.map
