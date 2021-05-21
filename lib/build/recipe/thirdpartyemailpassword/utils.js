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
const error_1 = require("./error");
const utils_2 = require("../emailpassword/utils");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(
        config,
        types_1.InputSchema,
        "thirdpartyemailpassword recipe",
        recipeInstance
    );
    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );
    let signUpFeature = validateAndNormaliseSignUpConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );
    let signInFeature = validateAndNormaliseSignInConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signInFeature
    );
    let resetPasswordUsingTokenFeature = config === undefined ? undefined : config.resetPasswordUsingTokenFeature;
    let providers = config === undefined || config.providers === undefined ? [] : config.providers;
    let signOutFeature = validateAndNormaliseSignOutConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signOutFeature
    );
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.emailVerificationFeature
    );
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
        override,
        sessionFeature,
        signUpFeature,
        signInFeature,
        providers,
        signOutFeature,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function defaultHandlePostSignUp(_, __) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultHandlePostSignIn(_, __) {
    return __awaiter(this, void 0, void 0, function* () {});
}
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
function validateAndNormaliseSignUpConfig(_, __, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = utils_2.normaliseSignUpFormFields(config === undefined ? undefined : config.formFields);
    let handlePostSignUp =
        config === undefined || config.handlePostSignUp === undefined
            ? defaultHandlePostSignUp
            : config.handlePostSignUp;
    return {
        disableDefaultImplementation,
        formFields,
        handlePostSignUp,
    };
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
function validateAndNormaliseSignInConfig(_, __, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let handlePostSignIn =
        config === undefined || config.handlePostSignIn === undefined
            ? defaultHandlePostSignIn
            : config.handlePostSignIn;
    return {
        disableDefaultImplementation,
        handlePostSignIn,
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
function validateAndNormaliseSignOutConfig(_, __, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    return {
        disableDefaultImplementation,
    };
}
function createNewPaginationToken(userId, timeJoined) {
    return Buffer.from(`${userId};${timeJoined}`).toString("base64");
}
exports.createNewPaginationToken = createNewPaginationToken;
function combinePaginationTokens(thirdPartyPaginationToken, emailPasswordPaginationToken) {
    return Buffer.from(`${thirdPartyPaginationToken};${emailPasswordPaginationToken}`).toString("base64");
}
exports.combinePaginationTokens = combinePaginationTokens;
function extractPaginationTokens(recipe, nextPaginationToken) {
    let extractedTokens = Buffer.from(nextPaginationToken, "base64").toString().split(";");
    if (extractedTokens.length !== 2) {
        throw new error_1.default(
            {
                type: "INVALID_PAGINATION_TOKEN",
                message: "nextPaginationToken is invalid",
            },
            recipe
        );
    }
    return {
        thirdPartyPaginationToken: extractedTokens[0] === "null" ? undefined : extractedTokens[0],
        emailPasswordPaginationToken: extractedTokens[1] === "null" ? undefined : extractedTokens[1],
    };
}
exports.extractPaginationTokens = extractPaginationTokens;
function combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, oldestFirst) {
    let maxLoop = Math.min(limit, thirdPartyResult.users.length + emailPasswordResult.users.length);
    let thirdPartyResultLoopIndex = 0;
    let emailPasswordResultLoopIndex = 0;
    let users = [];
    for (let i = 0; i < maxLoop; i++) {
        if (
            thirdPartyResultLoopIndex !== thirdPartyResult.users.length && // there are still users available in the thirdPartyResult
            (emailPasswordResultLoopIndex === emailPasswordResult.users.length || // no more users left in emailPasswordResult array to match against
                (oldestFirst &&
                    thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined <
                        emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined) ||
                (!oldestFirst &&
                    thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined >
                        emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined))
        ) {
            users.push(thirdPartyResult.users[thirdPartyResultLoopIndex]);
            thirdPartyResultLoopIndex++;
        } else {
            users.push(emailPasswordResult.users[emailPasswordResultLoopIndex]);
            emailPasswordResultLoopIndex++;
        }
    }
    let thirdPartyPaginationToken = null;
    let emailPasswordPaginationToken = null;
    // all users of thirdPartyResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (thirdPartyResultLoopIndex === thirdPartyResult.users.length) {
        thirdPartyPaginationToken =
            thirdPartyResult.nextPaginationToken === undefined ? null : thirdPartyResult.nextPaginationToken;
    } else {
        thirdPartyPaginationToken = createNewPaginationToken(
            thirdPartyResult.users[thirdPartyResultLoopIndex].id,
            thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined
        );
    }
    // all users of emailPasswordResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (emailPasswordResultLoopIndex === emailPasswordResult.users.length) {
        emailPasswordPaginationToken =
            emailPasswordResult.nextPaginationToken === undefined ? null : emailPasswordResult.nextPaginationToken;
    } else {
        emailPasswordPaginationToken = createNewPaginationToken(
            emailPasswordResult.users[emailPasswordResultLoopIndex].id,
            emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined
        );
    }
    let nextPaginationToken = combinePaginationTokens(thirdPartyPaginationToken, emailPasswordPaginationToken);
    return {
        users,
        nextPaginationToken,
    };
}
exports.combinePaginationResults = combinePaginationResults;
//# sourceMappingURL=utils.js.map
