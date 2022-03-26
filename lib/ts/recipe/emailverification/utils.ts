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
import { getEmailVerificationURL as defaultGetEmailVerificationURL } from "./emailVerificationFunctions";
import BackwardCompatibilityService from "./emaildelivery/services/backwardCompatibility";

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

    function getEmailDeliveryConfig() {
        let emailService = config.emailDelivery?.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityService(
                appInfo,
                recipe.isInServerlessEnv,
                config.createAndSendCustomEmail
            );
        }
        return {
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
    }
    return {
        getEmailForUserId,
        getEmailVerificationURL,
        override,
        getEmailDeliveryConfig,
    };
}
