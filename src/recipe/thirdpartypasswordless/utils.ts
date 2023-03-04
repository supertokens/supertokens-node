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

import { NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput } from "./types";
import { RecipeInterface, APIInterface } from "./types";
import BackwardCompatibilityEmailService from "./emaildelivery/services/backwardCompatibility";
import BackwardCompatibilitySmsService from "./smsdelivery/services/backwardCompatibility";

export function validateAndNormaliseUserInput(appInfo: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput {
    let providers = config.providers === undefined ? [] : config.providers;

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    function getEmailDeliveryConfig() {
        let emailService = config?.emailDelivery?.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityEmailService(appInfo, {
                createAndSendCustomEmail:
                    config?.contactMethod !== "PHONE" ? config?.createAndSendCustomEmail : undefined,
            });
        }
        return {
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
    }

    function getSmsDeliveryConfig() {
        let smsService = config?.smsDelivery?.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed smsDelivery config, we
         * use the createAndSendCustomTextMessage config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomTextMessage implementation
         */
        if (smsService === undefined) {
            smsService = new BackwardCompatibilitySmsService(appInfo, {
                createAndSendCustomTextMessage:
                    config?.contactMethod !== "EMAIL" ? config?.createAndSendCustomTextMessage : undefined,
            });
        }
        return {
            ...config?.smsDelivery,
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
    }

    return {
        ...config,
        providers,
        override,
        getEmailDeliveryConfig,
        getSmsDeliveryConfig,
    };
}
