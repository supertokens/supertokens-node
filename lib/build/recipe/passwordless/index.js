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
exports.sendSms =
    exports.sendEmail =
    exports.checkCode =
    exports.signInUp =
    exports.createMagicLink =
    exports.revokeCode =
    exports.revokeAllCodes =
    exports.updateUser =
    exports.createNewCodeForDevice =
    exports.listCodesByPreAuthSessionId =
    exports.listCodesByPhoneNumber =
    exports.listCodesByEmail =
    exports.listCodesByDeviceId =
    exports.consumeCode =
    exports.createCode =
    exports.Error =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const __1 = require("../..");
const utils_1 = require("../../utils");
class Wrapper {
    static createCode(input) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createCode(
            Object.assign(Object.assign({}, input), {
                session: input.session,
                shouldTryLinkingWithSessionUser: !!input.session,
                userContext: (0, utils_1.getUserContext)(input.userContext),
            })
        );
    }
    static createNewCodeForDevice(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.createNewCodeForDevice(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static consumeCode(input) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode(
            Object.assign(Object.assign({}, input), {
                session: input.session,
                shouldTryLinkingWithSessionUser: !!input.session,
                userContext: (0, utils_1.getUserContext)(input.userContext),
            })
        );
    }
    /**
     * This function will only verify the code (not consume it), and:
     * NOT create a new user if it doesn't exist
     * NOT verify the user email if it exists
     * NOT do any linking
     * NOT delete the code unless it returned RESTART_FLOW_ERROR
     */
    static checkCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.checkCode(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static updateUser(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateUser(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static revokeAllCodes(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeAllCodes(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static revokeCode(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.revokeCode(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static listCodesByEmail(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByEmail(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static listCodesByPhoneNumber(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPhoneNumber(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static listCodesByDeviceId(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByDeviceId(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static listCodesByPreAuthSessionId(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCodesByPreAuthSessionId(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static createMagicLink(input) {
        const ctx = (0, utils_1.getUserContext)(input.userContext);
        return recipe_1.default.getInstanceOrThrowError().createMagicLink(
            Object.assign(Object.assign({}, input), {
                request: (0, __1.getRequestFromUserContext)(ctx),
                userContext: ctx,
            })
        );
    }
    static signInUp(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .signInUp(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static async sendEmail(input) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .emailDelivery.ingredientInterfaceImpl.sendEmail(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static async sendSms(input) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .smsDelivery.ingredientInterfaceImpl.sendSms(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createCode = Wrapper.createCode;
exports.consumeCode = Wrapper.consumeCode;
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
exports.checkCode = Wrapper.checkCode;
exports.sendEmail = Wrapper.sendEmail;
exports.sendSms = Wrapper.sendSms;
