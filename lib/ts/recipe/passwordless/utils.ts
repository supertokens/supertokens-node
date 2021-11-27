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

export function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    if (config.contactMethod !== "PHONE" && config.contactMethod !== "EMAIL") {
        throw new Error('Please pass one of "PHONE" or "EMAIL" as the contactMethod');
    }

    if (config.flowType === undefined) {
        throw new Error("Please pass flowType argument in the config");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

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
        // TODO: is this gonna be the correct path?
        return (
            appInfo.websiteDomain.getAsStringDangerous() + appInfo.websiteBasePath.getAsStringDangerous() + "/verify"
        );
    };
}

function defaultValidatePhoneNumber(_: string): Promise<string | undefined> | string | undefined {
    // TODO:
    return undefined;
}

function defaultValidateEmail(_: string): Promise<string | undefined> | string | undefined {
    // TODO:
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
