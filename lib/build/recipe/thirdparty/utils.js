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
    utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "thirdparty recipe");
    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);
    let signOutFeature = validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config.signOutFeature);
    let override = {
        functions: (originalImplementation) => originalImplementation,
        apis: (originalImplementation) => originalImplementation,
    };
    if (config !== undefined && config.override !== undefined) {
        if (config.override.functions !== undefined) {
            override = Object.assign(Object.assign({}, override), { functions: config.override.functions });
        }
        if (config.override.apis !== undefined) {
            override = Object.assign(Object.assign({}, override), { apis: config.override.apis });
        }
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
function validateAndNormaliseSignInAndUpConfig(_, config) {
    let disableDefaultImplementation =
        config.disableDefaultImplementation === undefined ? false : config.disableDefaultImplementation;
    let handlePostSignUpIn =
        config.handlePostSignUpIn === undefined ? defaultHandlePostSignUpIn : config.handlePostSignUpIn;
    let providers = config.providers;
    if (providers === undefined || providers.length === 0) {
        throw new error_1.default({
            type: "BAD_INPUT_ERROR",
            message:
                "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config",
        });
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
    var _a;
    return (config === null || config === void 0 ? void 0 : config.emailVerificationFeature) === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              override: (_a = config.override) === null || _a === void 0 ? void 0 : _a.emailVerificationFeature,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.emailVerificationFeature.createAndSendCustomEmail === undefined
                      ? undefined
                      : (user, link) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _b;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_b =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _b === void 0
                                        ? void 0
                                        : _b.createAndSendCustomEmail) === undefined
                                ) {
                                    throw new error_1.default({
                                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    });
                                }
                                return yield config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                            }),
              getEmailVerificationURL:
                  config.emailVerificationFeature.getEmailVerificationURL === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _c;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_c =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _c === void 0
                                        ? void 0
                                        : _c.getEmailVerificationURL) === undefined
                                ) {
                                    throw new error_1.default({
                                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    });
                                }
                                return yield config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                            }),
              handlePostEmailVerification:
                  config.emailVerificationFeature.handlePostEmailVerification === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                var _d;
                                let userInfo = yield recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                                if (
                                    userInfo === undefined ||
                                    ((_d =
                                        config === null || config === void 0
                                            ? void 0
                                            : config.emailVerificationFeature) === null || _d === void 0
                                        ? void 0
                                        : _d.handlePostEmailVerification) === undefined
                                ) {
                                    throw new error_1.default({
                                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    });
                                }
                                return yield config.emailVerificationFeature.handlePostEmailVerification(userInfo);
                            }),
          };
}
//# sourceMappingURL=utils.js.map
