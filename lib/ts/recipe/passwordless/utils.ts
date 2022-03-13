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
import { IngredientInterface as EmailDeliveryIngredientInterface } from "../../ingredients/emaildelivery/types";
import { TypeEmailDeliveryTypeInput } from "./types";
// import { RecipeInterface as SmsDelvieryRecipeInterface } from "../smsdelivery/types";

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

    let emailService =
        config === undefined || config.emailDelivery === undefined
            ? undefined
            : undefined || config.emailDelivery.service;
    /**
     * following code is for backward compatibility.
     * if user has not passed emailDelivery config, we
     * use the createAndSendCustomEmail config. If the user
     * has not passed even that config, we use the default
     * createAndSendCustomEmail implementation
     */
    if (emailService === undefined) {
        emailService = {
            sendEmail: async (input: TypeEmailDeliveryTypeInput & { userContext: any }) => {
                if (config.contactMethod === "EMAIL" || config.contactMethod === "EMAIL_OR_PHONE") {
                    let createAndSendCustomEmail = config.createAndSendCustomEmail;
                    if (createAndSendCustomEmail === undefined) {
                        createAndSendCustomEmail = defaultCreateAndSendCustomEmail;
                    }
                    await createAndSendCustomEmail(
                        {
                            email: input.user.email,
                            userInputCode: input.userInputCode,
                            urlWithLinkCode: input.urlWithLinkCode,
                            preAuthSessionId: input.preAuthSessionId,
                            codeLifetime: input.codeLifetime,
                        },
                        input.userContext
                    );
                }
            },
        };
    }

    let emailDelivery = {
        service: emailService,
        override: (originalImplementation: EmailDeliveryIngredientInterface<TypeEmailDeliveryTypeInput>) =>
            originalImplementation,
        ...config.emailDelivery,
    };

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
            // createAndSendCustomEmail:
            //     // until we add a service to send emails, config.createAndSendCustomEmail will never be undefined
            //     config.createAndSendCustomEmail === undefined
            //         ? defaultCreateAndSendCustomEmail
            //         : config.createAndSendCustomEmail,
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
            emailDelivery,
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
        return {
            override,
            emailDelivery,
            // smsDelivery,
            flowType: config.flowType,
            contactMethod: "EMAIL_OR_PHONE",
            // until we add a service to send email, config.createAndSendCustomEmail will never be undefined
            // createAndSendCustomEmail:
            //     config.createAndSendCustomEmail === undefined
            //         ? defaultCreateAndSendCustomEmail
            //         : config.createAndSendCustomEmail,
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

async function defaultCreateAndSendCustomEmail(
    _: {
        // Where the message should be delivered.
        email: string;
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
