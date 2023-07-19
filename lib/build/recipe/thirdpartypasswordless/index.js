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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = exports.sendEmail = exports.createMagicLink = exports.revokeCode = exports.revokeAllCodes = exports.updatePasswordlessUser = exports.createNewCodeForDevice = exports.listCodesByPreAuthSessionId = exports.listCodesByPhoneNumber = exports.listCodesByEmail = exports.listCodesByDeviceId = exports.getUserByPhoneNumber = exports.consumeCode = exports.createCode = exports.getUsersByEmail = exports.getUserByThirdPartyInfo = exports.getUserById = exports.passwordlessSignInUp = exports.thirdPartyManuallyCreateOrUpdateUser = exports.thirdPartyGetProvider = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
class Wrapper {
    static thirdPartyGetProvider(tenantId, thirdPartyId, clientType, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
                thirdPartyId,
                tenantId,
                clientType,
                userContext,
            });
        });
    }
    static thirdPartyManuallyCreateOrUpdateUser(tenantId, thirdPartyId, thirdPartyUserId, email, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            tenantId,
            userContext,
        });
    }
    static getUserByThirdPartyInfo(tenantId, thirdPartyId, thirdPartyUserId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
            tenantId,
            userContext,
        });
    }
    static getUserById(userId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext });
    }
    static getUsersByEmail(tenantId, email, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({
            email,
            tenantId,
            userContext,
        });
    }
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
    static getUserByPhoneNumber(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserByPhoneNumber(Object.assign({ userContext: {} }, input));
    }
    static updatePasswordlessUser(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updatePasswordlessUser(Object.assign({ userContext: {} }, input));
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
        return recipe_1.default
            .getInstanceOrThrowError()
            .passwordlessRecipe.createMagicLink(Object.assign({ userContext: {} }, input));
    }
    static passwordlessSignInUp(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .passwordlessRecipe.signInUp(Object.assign({ userContext: {} }, input));
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .emailDelivery.ingredientInterfaceImpl.sendEmail(Object.assign({ userContext: {} }, input));
        });
    }
    static sendSms(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .smsDelivery.ingredientInterfaceImpl.sendSms(Object.assign({ userContext: {} }, input));
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.thirdPartyGetProvider = Wrapper.thirdPartyGetProvider;
exports.thirdPartyManuallyCreateOrUpdateUser = Wrapper.thirdPartyManuallyCreateOrUpdateUser;
exports.passwordlessSignInUp = Wrapper.passwordlessSignInUp;
exports.getUserById = Wrapper.getUserById;
exports.getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;
exports.getUsersByEmail = Wrapper.getUsersByEmail;
exports.createCode = Wrapper.createCode;
exports.consumeCode = Wrapper.consumeCode;
exports.getUserByPhoneNumber = Wrapper.getUserByPhoneNumber;
exports.listCodesByDeviceId = Wrapper.listCodesByDeviceId;
exports.listCodesByEmail = Wrapper.listCodesByEmail;
exports.listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;
exports.listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;
exports.createNewCodeForDevice = Wrapper.createNewCodeForDevice;
exports.updatePasswordlessUser = Wrapper.updatePasswordlessUser;
exports.revokeAllCodes = Wrapper.revokeAllCodes;
exports.revokeCode = Wrapper.revokeCode;
exports.createMagicLink = Wrapper.createMagicLink;
exports.sendEmail = Wrapper.sendEmail;
exports.sendSms = Wrapper.sendSms;
