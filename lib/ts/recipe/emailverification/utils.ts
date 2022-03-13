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
import { IngredientInterface as EmailDeliveryIngredientInterface } from "../../ingredients/emaildelivery/types";
import { TypeEmailVerificationEmailDeliveryInput } from "./types";

export function validateAndNormaliseUserInput(
    recipe: Recipe,
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

    let emailService = config?.emailDelivery?.service;
    /**
     * following code is for backward compatibility.
     * if user has not passed emailDelivery config, we
     * use the createAndSendCustomEmail config. If the user
     * has not passed even that config, we use the default
     * createAndSendCustomEmail implementation
     */
    if (emailService === undefined) {
        emailService = {
            sendEmail: async (input: TypeEmailVerificationEmailDeliveryInput) => {
                let createAndSendCustomEmail = config.createAndSendCustomEmail;
                if (createAndSendCustomEmail === undefined) {
                    createAndSendCustomEmail = defaultCreateAndSendCustomVerificationEmail(appInfo);
                }
                try {
                    if (!recipe.isInServerlessEnv) {
                        createAndSendCustomEmail(input.user, input.emailVerifyLink, input.userContext).catch((_) => {});
                    } else {
                        // see https://github.com/supertokens/supertokens-node/pull/135
                        await createAndSendCustomEmail(input.user, input.emailVerifyLink, input.userContext);
                    }
                } catch (_) {}
            },
        };
    }
    let emailDelivery = {
        service: emailService,
        override: (originalImplementation: EmailDeliveryIngredientInterface<TypeEmailVerificationEmailDeliveryInput>) =>
            originalImplementation,
        ...config.emailDelivery,
    };

    return {
        getEmailForUserId,
        getEmailVerificationURL,
        override,
        emailDelivery,
    };
}
