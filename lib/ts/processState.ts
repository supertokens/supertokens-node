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
import { env } from "node:process";

export enum PROCESS_STATE {
    CALLING_SERVICE_IN_VERIFY,
    CALLING_SERVICE_IN_GET_API_VERSION,
    CALLING_SERVICE_IN_REQUEST_HELPER,
    MULTI_JWKS_VALIDATION,

    IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS,
    IS_SIGN_UP_ALLOWED_CALLED,
    IS_SIGN_IN_ALLOWED_CALLED,
    IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED,

    ADDING_NO_CACHE_HEADER_IN_FETCH,
}

export class ProcessState {
    history: PROCESS_STATE[] = [];
    private static instance: ProcessState | undefined;

    private constructor() {}

    static getInstance() {
        if (ProcessState.instance === undefined) {
            ProcessState.instance = new ProcessState();
        }
        return ProcessState.instance;
    }

    addState = (state: PROCESS_STATE) => {
        if (env.TEST_MODE === "testing") {
            this.history.push(state);
        }
    };

    private getEventByLastEventByName = (state: PROCESS_STATE) => {
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i] === state) {
                return this.history[i];
            }
        }
        return undefined;
    };

    reset = () => {
        this.history = [];
    };

    waitForEvent = async (state: PROCESS_STATE, timeInMS = 7000) => {
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
