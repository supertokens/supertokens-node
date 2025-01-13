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
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
exports.defaultValidatePhoneNumber = defaultValidatePhoneNumber;
exports.defaultValidateEmail = defaultValidateEmail;
exports.getEnabledPwlessFactors = getEnabledPwlessFactors;
const max_1 = __importDefault(require("libphonenumber-js/max"));
const backwardCompatibility_1 = __importDefault(require("./emaildelivery/services/backwardCompatibility"));
const backwardCompatibility_2 = __importDefault(require("./smsdelivery/services/backwardCompatibility"));
const multifactorauth_1 = require("../multifactorauth");
function validateAndNormaliseUserInput(_, appInfo, config) {
    if (
        config.contactMethod !== "PHONE" &&
        config.contactMethod !== "EMAIL" &&
        config.contactMethod !== "EMAIL_OR_PHONE"
    ) {
        throw new Error('Please pass one of "PHONE", "EMAIL" or "EMAIL_OR_PHONE" as the contactMethod');
    }
    if (config.flowType === undefined) {
        throw new Error("Please pass flowType argument in the config");
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    function getEmailDeliveryConfig() {
        var _a;
        let emailService = (_a = config.emailDelivery) === null || _a === void 0 ? void 0 : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailService config, we use the default
         * createAndSendEmailUsingSupertokensService implementation
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(appInfo);
        }
        let emailDelivery = Object.assign(Object.assign({}, config.emailDelivery), {
            /**
             * if we do
             * let emailDelivery = {
             *    service: emailService,
             *    ...config.emailDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
            service: emailService,
        });
        return emailDelivery;
    }
    function getSmsDeliveryConfig() {
        var _a;
        let smsService = (_a = config.smsDelivery) === null || _a === void 0 ? void 0 : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomTextMessage config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomTextMessage implementation
         */
        if (smsService === undefined) {
            smsService = new backwardCompatibility_2.default();
        }
        let smsDelivery = Object.assign(Object.assign({}, config.smsDelivery), {
            /**
             * if we do
             * let smsDelivery = {
             *    service: smsService,
             *    ...config.smsDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
            service: smsService,
        });
        return smsDelivery;
    }
    if (config.contactMethod === "EMAIL") {
        return {
            override,
            getEmailDeliveryConfig,
            getSmsDeliveryConfig,
            flowType: config.flowType,
            contactMethod: "EMAIL",
            validateEmailAddress:
                config.validateEmailAddress === undefined ? defaultValidateEmail : config.validateEmailAddress,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    } else if (config.contactMethod === "PHONE") {
        return {
            override,
            getEmailDeliveryConfig,
            getSmsDeliveryConfig,
            flowType: config.flowType,
            contactMethod: "PHONE",
            validatePhoneNumber:
                config.validatePhoneNumber === undefined ? defaultValidatePhoneNumber : config.validatePhoneNumber,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    } else {
        return {
            override,
            getEmailDeliveryConfig,
            getSmsDeliveryConfig,
            flowType: config.flowType,
            contactMethod: "EMAIL_OR_PHONE",
            validateEmailAddress:
                config.validateEmailAddress === undefined ? defaultValidateEmail : config.validateEmailAddress,
            validatePhoneNumber:
                config.validatePhoneNumber === undefined ? defaultValidatePhoneNumber : config.validatePhoneNumber,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    }
}
function defaultValidatePhoneNumber(value) {
    if (typeof value !== "string") {
        return "Development bug: Please make sure the phoneNumber field is a string";
    }
    let parsedPhoneNumber = (0, max_1.default)(value);
    if (parsedPhoneNumber === undefined || !parsedPhoneNumber.isValid()) {
        return "Phone number is invalid";
    }
    // we can even use Twilio's phone number validity lookup service: https://www.twilio.com/docs/glossary/what-e164.
    return undefined;
}
function defaultValidateEmail(value) {
    // We check if the email syntax is correct
    // As per https://github.com/supertokens/supertokens-auth-react/issues/5#issuecomment-709512438
    // Regex from https://stackoverflow.com/a/46181/3867175
    if (typeof value !== "string") {
        return "Development bug: Please make sure the email field is a string";
    }
    if (
        value.match(
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ) === null
    ) {
        return "Email is invalid";
    }
    return undefined;
}
function getEnabledPwlessFactors(config) {
    let allFactors;
    if (config.flowType === "MAGIC_LINK") {
        if (config.contactMethod === "EMAIL") {
            allFactors = [multifactorauth_1.FactorIds.LINK_EMAIL];
        } else if (config.contactMethod === "PHONE") {
            allFactors = [multifactorauth_1.FactorIds.LINK_PHONE];
        } else {
            allFactors = [multifactorauth_1.FactorIds.LINK_EMAIL, multifactorauth_1.FactorIds.LINK_PHONE];
        }
    } else if (config.flowType === "USER_INPUT_CODE") {
        if (config.contactMethod === "EMAIL") {
            allFactors = [multifactorauth_1.FactorIds.OTP_EMAIL];
        } else if (config.contactMethod === "PHONE") {
            allFactors = [multifactorauth_1.FactorIds.OTP_PHONE];
        } else {
            allFactors = [multifactorauth_1.FactorIds.OTP_EMAIL, multifactorauth_1.FactorIds.OTP_PHONE];
        }
    } else {
        if (config.contactMethod === "EMAIL") {
            allFactors = [multifactorauth_1.FactorIds.OTP_EMAIL, multifactorauth_1.FactorIds.LINK_EMAIL];
        } else if (config.contactMethod === "PHONE") {
            allFactors = [multifactorauth_1.FactorIds.OTP_PHONE, multifactorauth_1.FactorIds.LINK_PHONE];
        } else {
            allFactors = [
                multifactorauth_1.FactorIds.OTP_EMAIL,
                multifactorauth_1.FactorIds.OTP_PHONE,
                multifactorauth_1.FactorIds.LINK_EMAIL,
                multifactorauth_1.FactorIds.LINK_PHONE,
            ];
        }
    }
    return allFactors;
}
