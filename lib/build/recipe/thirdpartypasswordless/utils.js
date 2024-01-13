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
const backwardCompatibility_1 = __importDefault(require("./emaildelivery/services/backwardCompatibility"));
const backwardCompatibility_2 = __importDefault(require("./smsdelivery/services/backwardCompatibility"));
function validateAndNormaliseUserInput(appInfo, config) {
    let providers = config.providers === undefined ? [] : config.providers;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    function getEmailDeliveryConfig() {
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
            emailService = new backwardCompatibility_1.default(appInfo);
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
    function getSmsDeliveryConfig() {
        var _a;
        let smsService =
            (_a = config === null || config === void 0 ? void 0 : config.smsDelivery) === null || _a === void 0
                ? void 0
                : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed smsDelivery config, we
         * use the createAndSendCustomTextMessage config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomTextMessage implementation
         */
        if (smsService === undefined) {
            smsService = new backwardCompatibility_2.default();
        }
        return Object.assign(Object.assign({}, config === null || config === void 0 ? void 0 : config.smsDelivery), {
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
        });
    }
    return Object.assign(Object.assign({}, config), {
        providers,
        override,
        getEmailDeliveryConfig,
        getSmsDeliveryConfig,
    });
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
