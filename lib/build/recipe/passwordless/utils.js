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
const max_1 = require("libphonenumber-js/max");
function validateAndNormaliseUserInput(_, appInfo, config) {
    if (config.contactMethod !== "PHONE" && config.contactMethod !== "EMAIL") {
        throw new Error('Please pass one of "PHONE" or "EMAIL" as the contactMethod');
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
    if (config.contactMethod === "EMAIL") {
        return {
            override,
            flowType: config.flowType,
            contactMethod: "EMAIL",
            createAndSendCustomEmail:
                config.createAndSendCustomEmail === undefined
                    ? defaultCreateAndSendCustomEmail
                    : config.createAndSendCustomEmail,
            getLinkDomainAndPath:
                config.getLinkDomainAndPath === undefined
                    ? getDefaultGetLinkDomainAndPath(appInfo)
                    : config.getLinkDomainAndPath,
            validateEmailAddress:
                config.validateEmailAddress === undefined ? defaultValidateEmail : config.validateEmailAddress,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    } else {
        return {
            override,
            flowType: config.flowType,
            contactMethod: "PHONE",
            createAndSendCustomTextMessage:
                config.createAndSendCustomTextMessage === undefined
                    ? defaultCreateAndSendTextMessage
                    : config.createAndSendCustomTextMessage,
            getLinkDomainAndPath:
                config.getLinkDomainAndPath === undefined
                    ? getDefaultGetLinkDomainAndPath(appInfo)
                    : config.getLinkDomainAndPath,
            validatePhoneNumber:
                config.validatePhoneNumber === undefined ? defaultValidatePhoneNumber : config.validatePhoneNumber,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    }
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function getDefaultGetLinkDomainAndPath(appInfo) {
    return (_, __) => {
        return (
            appInfo.websiteDomain.getAsStringDangerous() + appInfo.websiteBasePath.getAsStringDangerous() + "/verify"
        );
    };
}
function defaultValidatePhoneNumber(value) {
    if (typeof value !== "string") {
        return "Development bug: Please make sure the phoneNumber field is a string";
    }
    let parsedPhoneNumber = max_1.default(value);
    if (parsedPhoneNumber === undefined || !parsedPhoneNumber.isValid()) {
        return "Phone number is invalid";
    }
    // we can even use Twilio's phone number validity lookup service: https://www.twilio.com/docs/glossary/what-e164.
    return undefined;
}
function defaultCreateAndSendCustomEmail(_, __) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO:
    });
}
function defaultCreateAndSendTextMessage(_, __) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO:
    });
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
