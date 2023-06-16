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
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier, config) {
    function copyAndRemoveUserContext(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        return result;
    }
    return {
        createDevice: function (input) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                const { userContext, userIdentifierInfo } = input,
                    rest = __rest(input, ["userContext", "userIdentifierInfo"]);
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/totp/device"),
                    Object.assign(Object.assign({}, rest), {
                        skew: (_a = input.skew) !== null && _a !== void 0 ? _a : config.defaultSkew,
                        period: (_b = input.period) !== null && _b !== void 0 ? _b : config.defaultPeriod,
                    })
                );
                if (response.status !== "OK") {
                    return response;
                }
                let issuerName = config.issuer;
                let userIdentifier = userIdentifierInfo;
                return {
                    status: "OK",
                    issuerName,
                    userIdentifier,
                    secret: response.secret,
                    qrCodeString: encodeURI(
                        `otpauth://totp/${issuerName}${userIdentifier ? ":" + userIdentifier : ""}` +
                            `?secret=${response.secret}&issuer=${issuerName}`
                    ),
                };
            });
        },
        verifyDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/totp/device/verify"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        verifyCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/totp/verify"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        updateDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(
                    new normalisedURLPath_1.default("/recipe/totp/device"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        removeDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/totp/device/remove"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
        listDevices: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/totp/device/list"),
                    copyAndRemoveUserContext(input)
                );
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
