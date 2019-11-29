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
                return this.sendPostRequestHelper(path, body, this.hosts.length);
            });
        // path should start with "/"
        this.sendPostRequestHelper = (path, body, numberOfTries) =>
            __awaiter(this, void 0, void 0, function*() {
                if (numberOfTries == 0) {
                    throw error_1.generateError(
                        error_1.AuthError.GENERAL_ERROR,
                        new Error("no SuperTokens core available to query")
                    );
                }
                let currentHost = this.hosts[this.lastTriedIndex];
                this.lastTriedIndex++;
                this.lastTriedIndex = this.lastTriedIndex % this.hosts.length;
                try {
                    let response = yield axios_1.default.post(
                        "http://" + currentHost.hostname + ":" + currentHost.port + path,
                        body
                    );
                    if (response.status !== 200) {
                        throw response;
                    }
                    return response.data;
                } catch (err) {
                    if (err.message !== undefined && err.message.includes("ECONNREFUSED")) {
                        return yield this.sendPostRequestHelper(path, body, numberOfTries - 1);
                    }
                    if (
                        err.response !== undefined &&
                        err.response.status !== undefined &&
                        err.response.data !== undefined
                    ) {
                        throw error_1.generateError(
                            error_1.AuthError.GENERAL_ERROR,
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
                        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
                    }
                }
            });
    }
    static getInstance() {
        if (Querier.instance == undefined) {
            Querier.instance = new Querier();
        }
        if (Querier.instance.hosts.length == 0) {
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
