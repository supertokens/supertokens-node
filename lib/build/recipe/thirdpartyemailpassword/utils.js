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
exports.validateAndNormaliseUserInput = void 0;
const utils_1 = require("../emailpassword/utils");
const backwardCompatibility_1 = __importDefault(require("./emaildelivery/services/backwardCompatibility"));
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    let signUpFeature = validateAndNormaliseSignUpConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );
    let providers = config === undefined || config.providers === undefined ? [] : config.providers;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    function getEmailDeliveryConfig(isInServerlessEnv) {
        var _a;
        let emailService =
            (_a = config === null || config === void 0 ? void 0 : config.emailDelivery) === null || _a === void 0
                ? void 0
                : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailService config, we use the default
         * createAndSendEmailUsingSupertokensService implementation
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(appInfo, isInServerlessEnv);
        }
        return Object.assign(Object.assign({}, config === null || config === void 0 ? void 0 : config.emailDelivery), {
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
    }
    return {
        override,
        getEmailDeliveryConfig,
        signUpFeature,
        providers,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function validateAndNormaliseSignUpConfig(_, __, config) {
    let formFields = utils_1.normaliseSignUpFormFields(config === undefined ? undefined : config.formFields);
    return {
        formFields,
    };
}
