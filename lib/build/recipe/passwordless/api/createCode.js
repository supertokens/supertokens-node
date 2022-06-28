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
const utils_1 = require("../../../utils");
const error_1 = require("../error");
const max_1 = require("libphonenumber-js/max");
const utils_2 = require("../../../utils");
function createCode(apiImplementation, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (apiImplementation.createCodePOST === undefined) {
            return false;
        }
        const body = yield options.req.getJSONBody();
        let email = body.email;
        let phoneNumber = body.phoneNumber;
        if ((email !== undefined && phoneNumber !== undefined) || (email === undefined && phoneNumber === undefined)) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide exactly one of email or phoneNumber",
            });
        }
        if (email === undefined && options.config.contactMethod === "EMAIL") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: 'Please provide an email since you have set the contactMethod to "EMAIL"',
            });
        }
        if (phoneNumber === undefined && options.config.contactMethod === "PHONE") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: 'Please provide a phoneNumber since you have set the contactMethod to "PHONE"',
            });
        }
        // normalise and validate format of input
        if (
            email !== undefined &&
            (options.config.contactMethod === "EMAIL" || options.config.contactMethod === "EMAIL_OR_PHONE")
        ) {
            email = email.trim();
            const validateError = yield options.config.validateEmailAddress(email);
            if (validateError !== undefined) {
                utils_1.send200Response(options.res, {
                    status: "GENERAL_ERROR",
                    message: validateError,
                });
                return true;
            }
        }
        if (
            phoneNumber !== undefined &&
            (options.config.contactMethod === "PHONE" || options.config.contactMethod === "EMAIL_OR_PHONE")
        ) {
            const validateError = yield options.config.validatePhoneNumber(phoneNumber);
            if (validateError !== undefined) {
                utils_1.send200Response(options.res, {
                    status: "GENERAL_ERROR",
                    message: validateError,
                });
                return true;
            }
            const parsedPhoneNumber = max_1.default(phoneNumber);
            if (parsedPhoneNumber === undefined) {
                // this can come here if the user has provided their own impl of validatePhoneNumber and
                // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
                phoneNumber = phoneNumber.trim();
            } else {
                phoneNumber = parsedPhoneNumber.format("E.164");
            }
        }
        let result = yield apiImplementation.createCodePOST(
            email !== undefined
                ? { email, options, userContext: utils_2.makeDefaultUserContextFromAPI(options.req) }
                : { phoneNumber: phoneNumber, options, userContext: utils_2.makeDefaultUserContextFromAPI(options.req) }
        );
        utils_1.send200Response(options.res, result);
        return true;
    });
}
exports.default = createCode;
