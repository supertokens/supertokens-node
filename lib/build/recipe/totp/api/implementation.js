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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("../error"));
const recipe_1 = __importDefault(require("../recipe"));
function getAPIImplementation() {
    return {
        createDevicePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { session, options } = input,
                    rest = __rest(input, ["session", "options"]);
                let userIdentifierInfo = undefined;
                const emailOrPhoneInfo = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .getUserIdentifierInfoForUserId(session.getUserId(), input.userContext);
                if (emailOrPhoneInfo.status === "OK") {
                    userIdentifierInfo = emailOrPhoneInfo.info;
                }
                const args = Object.assign(Object.assign({}, rest), {
                    userId: session.getUserId(),
                    userIdentifierInfo,
                });
                let response = yield input.options.recipeImplementation.createDevice(args);
                return response;
            });
        },
        verifyCodePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { session, options } = input,
                    rest = __rest(input, ["session", "options"]);
                const args = Object.assign(Object.assign({}, rest), { userId: session.getUserId() });
                let response = yield input.options.recipeImplementation.verifyCode(args);
                if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                    throw new error_1.default({
                        type: "TOTP_NOT_ENABLED_ERROR",
                        message: "TOTP is not enabled for this user",
                    });
                }
                return response;
            });
        },
        verifyDevicePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { session, options } = input,
                    rest = __rest(input, ["session", "options"]);
                const args = Object.assign(Object.assign({}, rest), { userId: session.getUserId() });
                let response = yield input.options.recipeImplementation.verifyDevice(args);
                if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                    throw new error_1.default({
                        type: error_1.default.TOTP_NOT_ENABLED_ERROR,
                        message: "TOTP is not enabled for this user",
                    });
                }
                return response;
            });
        },
        removeDevicePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { session, options } = input,
                    rest = __rest(input, ["session", "options"]);
                const args = Object.assign(Object.assign({}, rest), { userId: session.getUserId() });
                let response = yield input.options.recipeImplementation.removeDevice(args);
                if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                    throw new error_1.default({
                        type: "TOTP_NOT_ENABLED_ERROR",
                        message: "TOTP is not enabled for this user",
                    });
                }
                return response;
            });
        },
        listDevicesGET: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { session, options } = input,
                    rest = __rest(input, ["session", "options"]);
                const args = Object.assign(Object.assign({}, rest), { userId: session.getUserId() });
                let response = yield input.options.recipeImplementation.listDevices(args);
                if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                    throw new error_1.default({
                        type: "TOTP_NOT_ENABLED_ERROR",
                        message: "TOTP is not enabled for this user",
                    });
                }
                return response;
            });
        },
    };
}
exports.default = getAPIImplementation;
