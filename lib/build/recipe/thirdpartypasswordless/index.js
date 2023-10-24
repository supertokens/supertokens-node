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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = exports.sendEmail = exports.createMagicLink = exports.revokeCode = exports.revokeAllCodes = exports.updatePasswordlessUser = exports.createNewCodeForDevice = exports.listCodesByPreAuthSessionId = exports.listCodesByPhoneNumber = exports.listCodesByEmail = exports.listCodesByDeviceId = exports.consumeCode = exports.createCode = exports.passwordlessSignInUp = exports.thirdPartyManuallyCreateOrUpdateUser = exports.thirdPartyGetProvider = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const __1 = require("../..");
class Wrapper {
    static async thirdPartyGetProvider(tenantId, thirdPartyId, clientType, userContext = {}) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            tenantId,
            clientType,
            userContext,
        });
    }
    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified,
        userContext = {}
    ) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            userContext,
        });
    }
    static createCode(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createCode(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static createNewCodeForDevice(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static consumeCode(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static updatePasswordlessUser(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updatePasswordlessUser(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static revokeAllCodes(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static revokeCode(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static listCodesByEmail(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static listCodesByPhoneNumber(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static listCodesByDeviceId(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static listCodesByPreAuthSessionId(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static createMagicLink(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().passwordlessRecipe.createMagicLink(
            Object.assign(Object.assign({}, input), {
                request: __1.getRequestFromUserContext(input.userContext),
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static passwordlessSignInUp(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().passwordlessRecipe.signInUp(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static async sendEmail(input) {
        var _a;
        return await recipe_1.default.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
    }
    static async sendSms(input) {
        var _a;
        return await recipe_1.default.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
            })
        );
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
exports.createCode = Wrapper.createCode;
exports.consumeCode = Wrapper.consumeCode;
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
