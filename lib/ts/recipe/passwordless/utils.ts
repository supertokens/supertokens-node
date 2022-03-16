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
import { BackwardCompatibilityService } from "./emaildelivery/services";
// import { RecipeInterface as SmsDelvieryRecipeInterface } from "../smsdelivery/types";

export function validateAndNormaliseUserInput(
    recipe: Recipe,
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

    let emailService = config.contactMethod === "PHONE" ? undefined : config.emailDelivery?.service;

    // let smsDelivery =
    //     config === undefined || config.smsDelivery === undefined
    //         ? undefined
    //         : {
    //             service: config.smsDelivery?.service,
    //             override: (originalImplementation: SmsDelvieryRecipeInterface<TypeSMSDeliveryTypeInput>) =>
    //                 originalImplementation,
    //             ...config.smsDelivery?.override,
    //         };

    if (config.contactMethod === "EMAIL") {
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityService(recipe.isInServerlessEnv, config.createAndSendCustomEmail);
        }
        let emailDelivery = {
            ...config?.emailDelivery,
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
        // TODO: to remove this
        if (config.createAndSendCustomEmail === undefined) {
            throw new Error("Please provide a callback function (createAndSendCustomEmail) to send emails. ");
        }
        return {
            override,
            emailDelivery,
            // smsDelivery,
            flowType: config.flowType,
            contactMethod: "EMAIL",
            getLinkDomainAndPath:
                config.getLinkDomainAndPath === undefined
                    ? getDefaultGetLinkDomainAndPath(appInfo)
                    : config.getLinkDomainAndPath,
            validateEmailAddress:
                config.validateEmailAddress === undefined ? defaultValidateEmail : config.validateEmailAddress,
            getCustomUserInputCode: config.getCustomUserInputCode,
        };
    } else if (config.contactMethod === "PHONE") {
        // TODO: to remove this
        if (config.createAndSendCustomTextMessage === undefined) {
            throw new Error(
                "Please provide a callback function (createAndSendCustomTextMessage) to send text messages. "
            );
        }
        return {
            override,
            // smsDelivery,
            flowType: config.flowType,
            contactMethod: "PHONE",
            // until we add a service to send sms, config.createAndSendCustomTextMessage will never be undefined
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
    } else {
        // TODO: to remove this
        if (config.createAndSendCustomEmail === undefined) {
            throw new Error("Please provide a callback function (createAndSendCustomEmail) to send emails. ");
        }
        if (config.createAndSendCustomTextMessage === undefined) {
            throw new Error(
                "Please provide a callback function (createAndSendCustomTextMessage) to send text messages. "
            );
        }
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityService(recipe.isInServerlessEnv, config.createAndSendCustomEmail);
        }
        let emailDelivery = {
            ...config?.emailDelivery,
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
        return {
            override,
            emailDelivery,
            // smsDelivery,
            flowType: config.flowType,
            contactMethod: "EMAIL_OR_PHONE",
            validateEmailAddress:
                config.validateEmailAddress === undefined ? defaultValidateEmail : config.validateEmailAddress,
            // until we add a service to send sms, config.createAndSendCustomTextMessage will never be undefined
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

function getDefaultGetLinkDomainAndPath(appInfo: NormalisedAppinfo) {
    return (
        _:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        __: any
    ): Promise<string> | string => {
        return (
            appInfo.websiteDomain.getAsStringDangerous() + appInfo.websiteBasePath.getAsStringDangerous() + "/verify"
        );
    };
}

function defaultValidatePhoneNumber(value: string): Promise<string | undefined> | string | undefined {
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

async function defaultCreateAndSendTextMessage(
    _: {
        // Where the message should be delivered.
        phoneNumber: string;
        // This has to be entered on the starting device  to finish sign in/up
        userInputCode?: string;
        // Full url that the end-user can click to finish sign in/up
        urlWithLinkCode?: string;
        codeLifetime: number;
        // Unlikely, but someone could display this (or a derived thing) to identify the device
        preAuthSessionId: string;
    },
    __: any
): Promise<void> {
    // TODO:
}

function defaultValidateEmail(value: string): Promise<string | undefined> | string | undefined {
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
