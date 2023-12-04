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

import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo } from "../../types";
import parsePhoneNumber from "libphonenumber-js/max";
import BackwardCompatibilityEmailService from "./emaildelivery/services/backwardCompatibility";
import BackwardCompatibilitySmsService from "./smsdelivery/services/backwardCompatibility";
import { User } from "../../user";

export function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
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

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    function getEmailDeliveryConfig() {
        let emailService = config.emailDelivery?.service;

        /**
         * following code is for backward compatibility.
         * if user has not passed emailService config, we use the default
         * createAndSendEmailUsingSupertokensService implementation
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityEmailService(appInfo);
        }
        let emailDelivery = {
            ...config.emailDelivery,
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
        };
        return emailDelivery;
    }

    function getSmsDeliveryConfig() {
        let smsService = config.smsDelivery?.service;

        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomTextMessage config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomTextMessage implementation
         */
        if (smsService === undefined) {
            smsService = new BackwardCompatibilitySmsService();
        }
        let smsDelivery = {
            ...config.smsDelivery,
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
        };
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

export function defaultValidatePhoneNumber(value: string): Promise<string | undefined> | string | undefined {
    if (typeof value !== "string") {
        return "Development bug: Please make sure the phoneNumber field is a string";
    }

    let parsedPhoneNumber = parsePhoneNumber(value);
    if (parsedPhoneNumber === undefined || !parsedPhoneNumber.isValid()) {
        return "Phone number is invalid";
    }

    // we can even use Twilio's phone number validity lookup service: https://www.twilio.com/docs/glossary/what-e164.

    return undefined;
}

export function defaultValidateEmail(value: string): Promise<string | undefined> | string | undefined {
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

export function isFactorSetupForUser(user: User, tenantId: string, factorId: string) {
    for (const loginMethod of user.loginMethods) {
        if (!loginMethod.tenantIds.includes(tenantId)) {
            continue;
        }

        // TODO MFA: discuss if we need to check verification status here
        if (loginMethod.email !== undefined) {
            if (factorId == "otp-email") {
                return true;
            }
            if (factorId == "link-email") {
                return true;
            }
        }

        if (loginMethod.phoneNumber !== undefined) {
            if (factorId == "otp-phone") {
                return true;
            }
            if (factorId == "link-phone") {
                return true;
            }
        }
    }
    return false;
}
