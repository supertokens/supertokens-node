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
const constants_1 = require("../emailpassword/constants");
const utils_2 = require("../emailpassword/utils");
function validateAndNormaliseUserInput(recipeInstance, appInfo, config) {
    utils_1.validateTheStructureOfUserInput(
        config,
        types_1.InputSchema,
        "thirdpartyemailpassword recipe",
        recipeInstance.getRecipeId()
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
    return {
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
function defaultValidator(value) {
    return __awaiter(this, void 0, void 0, function* () {
        return undefined;
    });
}
function defaultHandlePostSignUp(user, context) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultHandlePostSignIn(user, context) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultSetSessionDataForSession(user, context, action) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function defaultSetJwtPayloadForSession(user, context, action) {
    return __awaiter(this, void 0, void 0, function* () {
        return {};
    });
}
function validateAndNormaliseSignUpConfig(recipeInstance, appInfo, config) {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;
    let formFields = [];
    if (config !== undefined && config.formFields !== undefined) {
        config.formFields.forEach((field) => {
            if (field.id === constants_1.FORM_FIELD_PASSWORD_ID) {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? utils_2.defaultPasswordValidator : field.validate,
                    optional: false,
                });
            } else if (field.id === constants_1.FORM_FIELD_EMAIL_ID) {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? utils_2.defaultEmailValidator : field.validate,
                    optional: false,
                });
            } else {
                formFields.push({
                    id: field.id,
                    validate: field.validate === undefined ? defaultValidator : field.validate,
                    optional: field.optional === undefined ? false : field.optional,
                });
            }
        });
    }
    if (formFields.filter((field) => field.id === constants_1.FORM_FIELD_PASSWORD_ID).length === 0) {
        // no password field give by user
        formFields.push({
            id: constants_1.FORM_FIELD_PASSWORD_ID,
            validate: utils_2.defaultPasswordValidator,
            optional: false,
        });
    }
    if (formFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID).length === 0) {
        // no email field give by user
        formFields.push({
            id: constants_1.FORM_FIELD_EMAIL_ID,
            validate: utils_2.defaultEmailValidator,
            optional: false,
        });
    }
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
function validateAndNormaliseSessionFeatureConfig(recipeInstance, appInfo, config) {
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
function validateAndNormaliseSignInConfig(recipeInstance, appInfo, config) {
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
function validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config) {
    return config === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.disableDefaultImplementation,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.createAndSendCustomEmail === undefined
                      ? undefined
                      : (user, link) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.getUserById(user.id);
                                if (userInfo === undefined || config.createAndSendCustomEmail === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance.getRecipeId()
                                    );
                                }
                                return yield config.createAndSendCustomEmail(userInfo, link);
                            }),
              getEmailVerificationURL:
                  config.getEmailVerificationURL === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.getUserById(user.id);
                                if (userInfo === undefined || config.getEmailVerificationURL === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance.getRecipeId()
                                    );
                                }
                                return yield config.getEmailVerificationURL(userInfo);
                            }),
              handlePostEmailVerification:
                  config.handlePostEmailVerification === undefined
                      ? undefined
                      : (user) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield recipeInstance.getUserById(user.id);
                                if (userInfo === undefined || config.handlePostEmailVerification === undefined) {
                                    throw new error_1.default(
                                        {
                                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                                            message: "User ID unknown",
                                        },
                                        recipeInstance.getRecipeId()
                                    );
                                }
                                return yield config.handlePostEmailVerification(userInfo);
                            }),
          };
}
function validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config) {
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
            recipe.getRecipeId()
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
    let l = 0;
    let m = 0;
    let users = [];
    for (let i = 0; i < maxLoop; i++) {
        if (
            l !== thirdPartyResult.users.length && // there are still users available in the thirdPartyResult
            (m === emailPasswordResult.users.length || // no more users left in emailPasswordResult array to match against
                (oldestFirst && thirdPartyResult.users[l].timeJoined < emailPasswordResult.users[m].timeJoined) ||
                (!oldestFirst && thirdPartyResult.users[l].timeJoined > emailPasswordResult.users[m].timeJoined))
        ) {
            users.push(thirdPartyResult.users[l]);
            l++;
        } else {
            users.push(emailPasswordResult.users[m]);
            m++;
        }
    }
    let thirdPartyPaginationToken = null;
    let emailPasswordPaginationToken = null;
    // all users of thirdPartyResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (l === thirdPartyResult.users.length) {
        thirdPartyPaginationToken =
            thirdPartyResult.nextPaginationToken === undefined ? null : thirdPartyResult.nextPaginationToken;
    } else {
        thirdPartyPaginationToken = createNewPaginationToken(
            thirdPartyResult.users[l].id,
            thirdPartyResult.users[l].timeJoined
        );
    }
    // all users of emailPasswordResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (m === emailPasswordResult.users.length) {
        emailPasswordPaginationToken =
            emailPasswordResult.nextPaginationToken === undefined ? null : emailPasswordResult.nextPaginationToken;
    } else {
        emailPasswordPaginationToken = createNewPaginationToken(
            emailPasswordResult.users[m].id,
            emailPasswordResult.users[m].timeJoined
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
