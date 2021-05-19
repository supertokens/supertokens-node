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
const error_1 = require("./error");
const types_1 = require("./types");
function defaultHandlePostSignUpIn(_, __, ___) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "thirdparty recipe", recipeInstance);
    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config.emailVerificationFeature
    );
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(recipeInstance, appInfo, config.signInAndUpFeature);
    let signOutFeature = validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config.signOutFeature);
    let override;
    if (config !== undefined && config.override !== undefined && config.override.functions !== undefined) {
        override = {
            functions: config.override.functions,
        };
    } else {
        override = {
            functions: (originalImplementation) => originalImplementation,
        };
    }
    return {
        sessionFeature,
        emailVerificationFeature,
        signOutFeature,
        signInAndUpFeature,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function defaultSetSessionDataForSession(_, __, ___) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function defaultSetJwtPayloadForSession(_, __, ___) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function validateAndNormaliseSessionFeatureConfig(_, __, config) {
    let setJwtPayload =
        config === undefined || config.setJwtPayload === undefined
            ? defaultSetJwtPayloadForSession
            : config.setJwtPayload;
    let setSessionData =
        config === undefined || config.setSessionData === undefined
            ? defaultSetSessionDataForSession
            : config.setSessionData;
    return {
        setJwtPayload,
        setSessionData,
    };
}
function validateAndNormaliseSignInAndUpConfig(recipeInstance, _, config) {
    let disableDefaultImplementation =
        config.disableDefaultImplementation === undefined ? false : config.disableDefaultImplementation;
    let handlePostSignUpIn =
        config.handlePostSignUpIn === undefined ? defaultHandlePostSignUpIn : config.handlePostSignUpIn;
    let providers = config.providers;
    if (providers === undefined || providers.length === 0) {
        throw new error_1.default(
            {
                type: "BAD_INPUT_ERROR",
                message:
                    "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config",
            },
            recipeInstance
        );
    }
    return {
        disableDefaultImplementation,
        handlePostSignUpIn,
        providers,
    };
}
function validateAndNormaliseSignOutConfig(_, __, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    return {
        disableDefaultImplementation,
    };
}
function validateAndNormaliseEmailVerificationConfig(recipeInstance, _, config) {
    return config === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.disableDefaultImplementation,
              override: config.override,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.createAndSendCustomEmail === undefined
                      ? undefined
                      : (user, link) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (userInfo === undefined || config.createAndSendCustomEmail === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.createAndSendCustomEmail(userInfo, link);
                            }),
              getEmailVerificationURL:
                  config.getEmailVerificationURL === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (userInfo === undefined || config.getEmailVerificationURL === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.getEmailVerificationURL(userInfo);
                            }),
              handlePostEmailVerification:
                  config.handlePostEmailVerification === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (userInfo === undefined || config.handlePostEmailVerification === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance
                                    );
                                }
                                return yield config.handlePostEmailVerification(userInfo);
                            }),
          };
}
//# sourceMappingURL=utils.js.map
