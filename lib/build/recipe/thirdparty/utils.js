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
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
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
    return {
        getEmailDeliveryConfig,
        emailVerificationFeature,
        signInAndUpFeature,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function findRightProvider(providers, thirdPartyId, clientId) {
    return providers.find((p) => {
        let id = p.id;
        if (id !== thirdPartyId) {
            return false;
        }
        // first if there is only one provider with thirdPartyId in the providers array,
        let otherProvidersWithSameId = providers.filter((p1) => p1.id === id && p !== p1);
        if (otherProvidersWithSameId.length === 0) {
            // they we always return that.
            return true;
        }
        // otherwise, we look for the isDefault provider if clientId is missing
        if (clientId === undefined) {
            return p.isDefault === true;
        }
        // otherwise, we return a provider that matches based on client ID as well.
        return p.get(undefined, undefined, {}).getClientId({}) === clientId;
    });
}
exports.findRightProvider = findRightProvider;
function validateAndNormaliseSignInAndUpConfig(_, config) {
    let providers = config.providers;
    if (providers === undefined || providers.length === 0) {
        throw new Error(
            "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config"
        );
    }
    // we check if there are multiple providers with the same id that have isDefault as true.
    // In this case, we want to throw an error..
    let isDefaultProvidersSet = new Set();
    let allProvidersSet = new Set();
    providers.forEach((p) => {
        let id = p.id;
        allProvidersSet.add(p.id);
        let isDefault = p.isDefault;
        if (isDefault === undefined) {
            // if this id is not being used by any other provider, we treat this as the isDefault
            let otherProvidersWithSameId = providers.filter((p1) => p1.id === id && p !== p1);
            if (otherProvidersWithSameId.length === 0) {
                // we treat this as the isDefault now...
                isDefault = true;
            }
        }
        if (isDefault) {
            if (isDefaultProvidersSet.has(id)) {
                throw new Error(
                    `You have provided multiple third party providers that have the id: "${id}" and are marked as "isDefault: true". Please only mark one of them as isDefault.`
                );
            }
            isDefaultProvidersSet.add(id);
        }
    });
    if (isDefaultProvidersSet.size !== allProvidersSet.size) {
        // this means that there is no provider marked as isDefault
        throw new Error(
            `The providers array has multiple entries for the same third party provider. Please mark one of them as the default one by using "isDefault: true".`
        );
    }
    return {
        providers,
    };
}
function validateAndNormaliseEmailVerificationConfig(recipeInstance, _, config) {
    var _a, _b, _c;
    return {
        getEmailForUserId: recipeInstance.getEmailForUserId,
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
