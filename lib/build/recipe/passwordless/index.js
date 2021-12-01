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
const recipe_1 = require("./recipe");
const error_1 = require("./error");
class Wrapper {
    static createCode(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createCode(input, userContext);
    }
    static resendCode(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.resendCode(input, userContext);
    }
    static consumeCode(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode(input, userContext);
    }
    static getUserById(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById(input, userContext);
    }
    static getUserByEmail(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail(input, userContext);
    }
    static getUserByPhoneNumber(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber(input, userContext);
    }
    static updateUser(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateUser(input, userContext);
    }
    static revokeAllCodes(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes(input, userContext);
    }
    static revokeCode(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode(input, userContext);
    }
    static listCodesByEmail(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail(input, userContext);
    }
    static listCodesByPhoneNumber(input, userContext = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPhoneNumber(input, userContext);
    }
    static listCodesByDeviceId(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId(input, userContext);
    }
    static listCodesByPreAuthSessionId(input, userContext = {}) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPreAuthSessionId(input, userContext);
    }
    static createMagicLink(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().createMagicLink(input, userContext);
    }
    static signInUp(input, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().signInUp(input, userContext);
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createCode = Wrapper.createCode;
exports.consumeCode = Wrapper.consumeCode;
exports.getUserByEmail = Wrapper.getUserByEmail;
exports.getUserById = Wrapper.getUserById;
exports.getUserByPhoneNumber = Wrapper.getUserByPhoneNumber;
exports.listCodesByDeviceId = Wrapper.listCodesByDeviceId;
exports.listCodesByEmail = Wrapper.listCodesByEmail;
exports.listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;
exports.listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;
exports.resendCode = Wrapper.resendCode;
exports.updateUser = Wrapper.updateUser;
exports.revokeAllCodes = Wrapper.revokeAllCodes;
exports.revokeCode = Wrapper.revokeCode;
exports.createMagicLink = Wrapper.createMagicLink;
exports.signInUp = Wrapper.signInUp;
