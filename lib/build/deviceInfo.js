"use strict";
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
const error_1 = require("./error");
class DeviceInfo {
    constructor() {
        this.frontendSDK = [];
        this.getFrontendSDKs = () => {
            return this.frontendSDK;
        };
        this.addToFrontendSDKs = (sdk) => {
            let alreadyExists = false;
            this.frontendSDK.forEach(i => {
                if (i.name == sdk.name && i.version == sdk.version) {
                    alreadyExists = true;
                }
            });
            if (alreadyExists) {
                return;
            }
            this.frontendSDK.push(sdk);
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        DeviceInfo.instance = undefined;
    }
    static getInstance() {
        if (DeviceInfo.instance == undefined) {
            DeviceInfo.instance = new DeviceInfo();
        }
        return DeviceInfo.instance;
    }
}
exports.DeviceInfo = DeviceInfo;
//# sourceMappingURL=deviceInfo.js.map