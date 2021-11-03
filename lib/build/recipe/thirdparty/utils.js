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
const utils_1 = require("../../utils");
const types_1 = require("./types");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "thirdparty recipe");
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    return {
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
        // otherwise, we look for the primary provider if clientId is missing
        if (clientId === undefined) {
            return p.primary === true;
        }
        // otherwise, we return a provider that matches based on client ID as well.
        return p.get(undefined, undefined).getClientId() === clientId;
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
    // we check if there are multiple providers with the same id that have primary as true.
    // In this case, we want to throw an error..
    let primaryProvidersSet = new Set();
    providers.forEach((p) => {
        let id = p.id;
        let isPrimary = p.primary;
        if (isPrimary === undefined) {
            // if this id is not being used by any other provider, we treat this as the primary
            let otherProvidersWithSameId = providers.filter((p1) => p1.id === id && p !== p1);
            if (otherProvidersWithSameId.length === 0) {
                // we treat this as the primary now...
                isPrimary = true;
            }
        }
        if (isPrimary) {
            if (primaryProvidersSet.has(id)) {
                throw new Error(
                    `You have provided multiple third party providers that have the id: "${id}" and are marked as primary. Please only mark one of them as primary.`
                );
            }
            primaryProvidersSet.add(id);
        }
    });
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
                : (user, link) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _d;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
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
                          return yield config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                      }),
        getEmailVerificationURL:
            ((_c = config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === null ||
            _c === void 0
                ? void 0
                : _c.getEmailVerificationURL) === undefined
                ? undefined
                : (user) =>
                      __awaiter(this, void 0, void 0, function* () {
                          var _e;
                          let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
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
                          return yield config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                      }),
    };
}
