"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.listDevices = exports.removeDevice = exports.updateDevice = exports.verifyCode = exports.verifyDevice = exports.createDevice = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
class Wrapper {
    static createDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createDevice(Object.assign({ userContext: {} }, input));
    }
    static verifyDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.verifyDevice(Object.assign({ userContext: {} }, input));
    }
    static verifyCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.verifyCode(Object.assign({ userContext: {} }, input));
    }
    static updateDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateDevice(Object.assign({ userContext: {} }, input));
    }
    static removeDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.removeDevice(Object.assign({ userContext: {} }, input));
    }
    static listDevices(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listDevices(Object.assign({ userContext: {} }, input));
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createDevice = Wrapper.createDevice;
exports.verifyDevice = Wrapper.verifyDevice;
exports.verifyCode = Wrapper.verifyCode;
exports.updateDevice = Wrapper.updateDevice;
exports.removeDevice = Wrapper.removeDevice;
exports.listDevices = Wrapper.listDevices;
