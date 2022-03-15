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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const emailVerificationFunctions_1 = require("./emailVerificationFunctions");
const emaildelivery_1 = require("./emaildelivery");
function validateAndNormaliseUserInput(recipe, appInfo, config) {
    var _a;
    let getEmailVerificationURL =
        config.getEmailVerificationURL === undefined
            ? emailVerificationFunctions_1.getEmailVerificationURL(appInfo)
            : config.getEmailVerificationURL;
    let getEmailForUserId = config.getEmailForUserId;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    let emailService = (_a = config.emailDelivery) === null || _a === void 0 ? void 0 : _a.service;
    /**
     * following code is for backward compatibility.
     * if user has not passed emailDelivery config, we
     * use the createAndSendCustomEmail config. If the user
     * has not passed even that config, we use the default
     * createAndSendCustomEmail implementation
     */
    if (emailService === undefined) {
        emailService = {
            sendEmail: (input) =>
                __awaiter(this, void 0, void 0, function* () {
                    yield emaildelivery_1.normaliseAndInvokeDefaultCreateAndSendCustomEmail(
                        appInfo,
                        input,
                        recipe.isInServerlessEnv,
                        config.createAndSendCustomEmail
                    );
                }),
        };
    }
    let emailDelivery = Object.assign(Object.assign({}, config.emailDelivery), {
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
    return {
        getEmailForUserId,
        getEmailVerificationURL,
        override,
        emailDelivery,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
