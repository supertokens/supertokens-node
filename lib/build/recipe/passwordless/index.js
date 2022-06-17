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
const recipe_1 = require("./recipe");
const error_1 = require("./error");
class Wrapper {
    static createCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createCode(Object.assign({ userContext: {} }, input));
    }
    static createNewCodeForDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createNewCodeForDevice(Object.assign({ userContext: {} }, input));
    }
    static consumeCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.consumeCode(Object.assign({ userContext: {} }, input));
    }
    static getUserById(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserById(Object.assign({ userContext: {} }, input));
    }
    static getUserByEmail(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserByEmail(Object.assign({ userContext: {} }, input));
    }
    static getUserByPhoneNumber(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserByPhoneNumber(Object.assign({ userContext: {} }, input));
    }
    static updateUser(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateUser(Object.assign({ userContext: {} }, input));
    }
    static revokeAllCodes(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeAllCodes(Object.assign({ userContext: {} }, input));
    }
    static revokeCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeCode(Object.assign({ userContext: {} }, input));
    }
    static listCodesByEmail(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByEmail(Object.assign({ userContext: {} }, input));
    }
    static listCodesByPhoneNumber(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPhoneNumber(Object.assign({ userContext: {} }, input));
    }
    static listCodesByDeviceId(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByDeviceId(Object.assign({ userContext: {} }, input));
    }
    static listCodesByPreAuthSessionId(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPreAuthSessionId(Object.assign({ userContext: {} }, input));
    }
    static createMagicLink(input) {
        return recipe_1.default.getInstanceOrThrowError().createMagicLink(Object.assign({ userContext: {} }, input));
    }
    static signInUp(input) {
        return recipe_1.default.getInstanceOrThrowError().signInUp(Object.assign({ userContext: {} }, input));
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .emailDelivery.ingredientInterfaceImpl.sendEmail(input);
        });
    }
    static sendSms(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms(input);
        });
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
exports.createNewCodeForDevice = Wrapper.createNewCodeForDevice;
exports.updateUser = Wrapper.updateUser;
exports.revokeAllCodes = Wrapper.revokeAllCodes;
exports.revokeCode = Wrapper.revokeCode;
exports.createMagicLink = Wrapper.createMagicLink;
exports.signInUp = Wrapper.signInUp;
exports.sendEmail = Wrapper.sendEmail;
exports.sendSms = Wrapper.sendSms;
