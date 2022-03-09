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
import {
    getEmailVerificationURL as defaultGetEmailVerificationURL,
    createAndSendCustomEmail as defaultCreateAndSendCustomVerificationEmail,
} from "./emailVerificationFunctions";
import { RecipeInterface as EmailDelvieryRecipeInterface } from "../emaildelivery/types";
import { TypeEmailDeliveryTypeInput } from "./types";

export function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    let getEmailVerificationURL =
        config.getEmailVerificationURL === undefined
            ? defaultGetEmailVerificationURL(appInfo)
            : config.getEmailVerificationURL;

    let getEmailForUserId = config.getEmailForUserId;

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    let emailService =
        config === undefined || config.emailDelivery === undefined
            ? undefined
            : undefined || config.emailDelivery.service;
    if (emailService === undefined) {
        emailService = {
            sendEmail: async (input: TypeEmailDeliveryTypeInput, userContext: any) => {
                let createAndSendCustomEmail = config.createAndSendCustomEmail;
                if (createAndSendCustomEmail === undefined) {
                    createAndSendCustomEmail = defaultCreateAndSendCustomVerificationEmail(appInfo);
                }
                await createAndSendCustomEmail(input.user, input.emailVerifyLink, userContext);
            },
        };
    }
    let emailDelivery = {
        service: emailService,
        override: (originalImplementation: EmailDelvieryRecipeInterface<TypeEmailDeliveryTypeInput>) =>
            originalImplementation,
        ...config.emailDelivery?.override,
    };

    return {
        getEmailForUserId,
        getEmailVerificationURL,
        override,
        emailDelivery,
    };
}
