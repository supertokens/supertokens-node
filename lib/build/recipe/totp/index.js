"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTOTP =
    exports.verifyDevice =
    exports.removeDevice =
    exports.updateDevice =
    exports.listDevices =
    exports.createDevice =
    exports.init =
        void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static async createDevice(userId, userIdentifierInfo, deviceName, skew, period, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createDevice({
            userId,
            userIdentifierInfo,
            deviceName,
            skew,
            period,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async updateDevice(userId, existingDeviceName, newDeviceName, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateDevice({
            userId,
            existingDeviceName,
            newDeviceName,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async listDevices(userId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listDevices({
            userId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async removeDevice(userId, deviceName, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeDevice({
            userId,
            deviceName,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async verifyDevice(tenantId, userId, deviceName, totp, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyDevice({
            tenantId,
            userId,
            deviceName,
            totp,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async verifyTOTP(tenantId, userId, totp, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyTOTP({
            tenantId,
            userId,
            totp,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.createDevice = Wrapper.createDevice;
exports.listDevices = Wrapper.listDevices;
exports.updateDevice = Wrapper.updateDevice;
exports.removeDevice = Wrapper.removeDevice;
exports.verifyDevice = Wrapper.verifyDevice;
exports.verifyTOTP = Wrapper.verifyTOTP;
