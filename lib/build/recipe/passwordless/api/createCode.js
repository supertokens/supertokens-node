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
exports.default = createCode;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
const max_1 = __importDefault(require("libphonenumber-js/max"));
const authUtils_1 = require("../../../authUtils");
async function createCode(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.createCodePOST === undefined) {
        return false;
    }
    const body = await options.req.getJSONBody();
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
        const validateError = await options.config.validateEmailAddress(email, tenantId);
        if (validateError !== undefined) {
            (0, utils_1.send200Response)(options.res, {
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
        const validateError = await options.config.validatePhoneNumber(phoneNumber, tenantId);
        if (validateError !== undefined) {
            (0, utils_1.send200Response)(options.res, {
                status: "GENERAL_ERROR",
                message: validateError,
            });
            return true;
        }
        const parsedPhoneNumber = (0, max_1.default)(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
    }
    const shouldTryLinkingWithSessionUser = (0, utils_1.getNormalisedShouldTryLinkingWithSessionUserFlag)(
        options.req,
        body
    );
    const session = await authUtils_1.AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );
    if (session !== undefined) {
        tenantId = session.getTenantId();
    }
    let result = await apiImplementation.createCodePOST(
        email !== undefined
            ? { email, session, tenantId, shouldTryLinkingWithSessionUser, options, userContext }
            : { phoneNumber: phoneNumber, session, tenantId, shouldTryLinkingWithSessionUser, options, userContext }
    );
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
