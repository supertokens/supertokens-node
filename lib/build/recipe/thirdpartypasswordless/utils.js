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
const backwardCompatibility_1 = require("./emaildelivery/services/backwardCompatibility");
const backwardCompatibility_2 = require("./smsdelivery/services/backwardCompatibility");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    let providers = config.providers === undefined ? [] : config.providers;
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    function getEmailDeliveryConfig(recipeImpl, isInServerlessEnv) {
        var _a;
        let emailService =
            (_a = config === null || config === void 0 ? void 0 : config.emailDelivery) === null || _a === void 0
                ? void 0
                : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(
                recipeImpl,
                appInfo,
                isInServerlessEnv,
                {
                    createAndSendCustomEmail:
                        (config === null || config === void 0 ? void 0 : config.contactMethod) !== "PHONE"
                            ? config === null || config === void 0
                                ? void 0
                                : config.createAndSendCustomEmail
                            : undefined,
                },
                config === null || config === void 0 ? void 0 : config.emailVerificationFeature
            );
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
            smsService = new backwardCompatibility_2.default(appInfo, {
                createAndSendCustomTextMessage:
                    (config === null || config === void 0 ? void 0 : config.contactMethod) !== "EMAIL"
                        ? config === null || config === void 0
                            ? void 0
                            : config.createAndSendCustomTextMessage
                        : undefined,
            });
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
        emailVerificationFeature,
        override,
        getEmailDeliveryConfig,
        getSmsDeliveryConfig,
    });
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function validateAndNormaliseEmailVerificationConfig(recipeInstance, _, config) {
    var _a, _b, _c;
    return {
        getEmailForUserId: recipeInstance.getEmailForUserIdForEmailVerification,
        override:
            (_a = config === null || config === void 0 ? void 0 : config.override) === null || _a === void 0
                ? void 0
                : _a.emailVerificationFeature,
        createAndSendCustomEmail:
            ((_b = config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === null ||
            _b === void 0
                ? void 0
                : _b.createAndSendCustomEmail) === undefined
                ? undefined
                : (user, link, userContext) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _d;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({
                              userId: user.id,
                              userContext,
                          });
                          if (
                              userInfo === undefined ||
                              ((_d =
                                  config === null || config === void 0 ? void 0 : config.emailVerificationFeature) ===
                                  null || _d === void 0
                                  ? void 0
                                  : _d.createAndSendCustomEmail) === undefined
                          ) {
                              throw new Error("Unknown User ID provided");
                          }
                          return yield config.emailVerificationFeature.createAndSendCustomEmail(
                              userInfo,
                              link,
                              userContext
                          );
                      }),
        getEmailVerificationURL:
            ((_c = config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === null ||
            _c === void 0
                ? void 0
                : _c.getEmailVerificationURL) === undefined
                ? undefined
                : (user, userContext) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _e;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({
                              userId: user.id,
                              userContext,
                          });
                          if (
                              userInfo === undefined ||
                              ((_e =
                                  config === null || config === void 0 ? void 0 : config.emailVerificationFeature) ===
                                  null || _e === void 0
                                  ? void 0
                                  : _e.getEmailVerificationURL) === undefined
                          ) {
                              throw new Error("Unknown User ID provided");
                          }
                          return yield config.emailVerificationFeature.getEmailVerificationURL(userInfo, userContext);
                      }),
    };
}
