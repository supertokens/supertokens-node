"use strict";
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
var PROCESS_STATE;
(function (PROCESS_STATE) {
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_VERIFY"] = 0)] = "CALLING_SERVICE_IN_VERIFY";
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_GET_HANDSHAKE_INFO"] = 1)] =
        "CALLING_SERVICE_IN_GET_HANDSHAKE_INFO";
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_GET_API_VERSION"] = 2)] = "CALLING_SERVICE_IN_GET_API_VERSION";
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_REQUEST_HELPER"] = 3)] = "CALLING_SERVICE_IN_REQUEST_HELPER";
})((PROCESS_STATE = exports.PROCESS_STATE || (exports.PROCESS_STATE = {})));
class ProcessState {
    constructor() {
        this.history = [];
        this.addState = (state) => {
            if (process.env.TEST_MODE === "testing") {
                this.history.push(state);
            }
        };
        this.getEventByLastEventByName = (state) => {
            for (let i = this.history.length - 1; i >= 0; i--) {
                if (this.history[i] === state) {
                    return this.history[i];
                }
            }
            return undefined;
        };
        this.reset = () => {
            this.history = [];
        };
        this.waitForEvent = (state, timeInMS = 7000) =>
            __awaiter(this, void 0, void 0, function* () {
                let startTime = Date.now();
                return new Promise((resolve) => {
                    let actualThis = this;
                    function tryAndGet() {
                        let result = actualThis.getEventByLastEventByName(state);
                        if (result === undefined) {
                            if (Date.now() - startTime > timeInMS) {
                                resolve(undefined);
                            } else {
                                setTimeout(tryAndGet, 1000);
                            }
                        } else {
                            resolve(result);
                        }
                    }
                    tryAndGet();
                });
            });
    }
    static getInstance() {
        if (ProcessState.instance === undefined) {
            ProcessState.instance = new ProcessState();
        }
        return ProcessState.instance;
    }
}
exports.ProcessState = ProcessState;
