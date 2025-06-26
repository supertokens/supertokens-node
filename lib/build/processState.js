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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessState = exports.PROCESS_STATE = void 0;
const utils_1 = require("./utils");
var PROCESS_STATE;
(function (PROCESS_STATE) {
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_VERIFY"] = 0)] = "CALLING_SERVICE_IN_VERIFY";
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_GET_API_VERSION"] = 1)] = "CALLING_SERVICE_IN_GET_API_VERSION";
    PROCESS_STATE[(PROCESS_STATE["CALLING_SERVICE_IN_REQUEST_HELPER"] = 2)] = "CALLING_SERVICE_IN_REQUEST_HELPER";
    PROCESS_STATE[(PROCESS_STATE["MULTI_JWKS_VALIDATION"] = 3)] = "MULTI_JWKS_VALIDATION";
    PROCESS_STATE[(PROCESS_STATE["IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS"] = 4)] =
        "IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS";
    PROCESS_STATE[(PROCESS_STATE["IS_SIGN_UP_ALLOWED_CALLED"] = 5)] = "IS_SIGN_UP_ALLOWED_CALLED";
    PROCESS_STATE[(PROCESS_STATE["IS_SIGN_IN_ALLOWED_CALLED"] = 6)] = "IS_SIGN_IN_ALLOWED_CALLED";
    PROCESS_STATE[(PROCESS_STATE["IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED"] = 7)] = "IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED";
    PROCESS_STATE[(PROCESS_STATE["ADDING_NO_CACHE_HEADER_IN_FETCH"] = 8)] = "ADDING_NO_CACHE_HEADER_IN_FETCH";
})(PROCESS_STATE || (exports.PROCESS_STATE = PROCESS_STATE = {}));
class ProcessState {
    constructor() {
        this.history = [];
        this.addState = (state) => {
            if ((0, utils_1.isTestEnv)()) {
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
        this.waitForEvent = async (state, timeInMS = 7000) => {
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
        };
    }
    static getInstance() {
        if (ProcessState.instance === undefined) {
            ProcessState.instance = new ProcessState();
        }
        return ProcessState.instance;
    }
}
exports.ProcessState = ProcessState;
