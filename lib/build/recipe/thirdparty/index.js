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
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLab = exports.Bitbucket = exports.GoogleWorkspaces = exports.Discord = exports.Apple = exports.Facebook = exports.Github = exports.Google = exports.linkThirdPartyAccountWithUserFromSession = exports.signInUp = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const thirdPartyProviders = __importStar(require("./providers"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const accountlinking_1 = require("../accountlinking");
class Wrapper {
    static signInUp(thirdPartyId, thirdPartyUserId, email, isVerified, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof isVerified !== "boolean") {
                throw new global.Error("please change test");
            }
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({
                thirdPartyId,
                thirdPartyUserId,
                email,
                isVerified,
                userContext,
            });
        });
    }
    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required.
     */
    static linkThirdPartyAccountWithUserFromSession(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            const createRecipeUserFunc = (userContext) =>
                __awaiter(this, void 0, void 0, function* () {
                    let resp = yield recipeInstance.recipeInterfaceImpl.createNewOrUpdateEmailOfRecipeUser({
                        thirdPartyId: input.thirdPartyId,
                        thirdPartyUserId: input.thirdPartyUserId,
                        email: input.email,
                        userContext,
                    });
                    if (resp.status === "OK") {
                        if (resp.createdNewUser) {
                            if (input.isVerified) {
                                const emailVerificationInstance = recipe_2.default.getInstance();
                                if (emailVerificationInstance) {
                                    const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                        {
                                            recipeUserId: resp.user.loginMethods[0].recipeUserId,
                                            email: input.email,
                                            userContext,
                                        }
                                    );
                                    if (tokenResponse.status === "OK") {
                                        yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                            token: tokenResponse.token,
                                            attemptAccountLinking: false,
                                            // already try and do account linking.
                                            userContext,
                                        });
                                    }
                                }
                            }
                        }
                    }
                    // the other status type of EMAIL_CHANGE_NOT_ALLOWED_ERROR should not happen
                    // cause that is only possible when signing in, and here we only try and create
                    // a new user.
                });
            const verifyCredentialsFunc = (userContext) =>
                __awaiter(this, void 0, void 0, function* () {
                    let resp = yield recipeInstance.recipeInterfaceImpl.createNewOrUpdateEmailOfRecipeUser({
                        thirdPartyId: input.thirdPartyId,
                        thirdPartyUserId: input.thirdPartyUserId,
                        email: input.email,
                        userContext,
                    });
                    if (resp.status === "OK") {
                        return {
                            status: "OK",
                        };
                    }
                    return {
                        status: "CUSTOM_RESPONSE",
                        resp: {
                            status: "SIGN_IN_NOT_ALLOWED",
                            reason: resp.reason,
                        },
                    };
                });
            let response = yield accountlinking_1.linkAccountsWithUserFromSession({
                session: input.session,
                newUser: {
                    recipeId: "thirdparty",
                    email: input.email,
                    thirdParty: {
                        id: input.thirdPartyId,
                        userId: input.thirdPartyUserId,
                    },
                },
                createRecipeUserFunc,
                verifyCredentialsFunc,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
            if (response.status === "CUSTOM_RESPONSE") {
                return response.resp;
            }
            if (response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                return {
                    status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                    primaryUserId: response.primaryUserId,
                    recipeUserId: response.recipeUserId,
                    email: input.email,
                };
            }
            return response;
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
Wrapper.Google = thirdPartyProviders.Google;
Wrapper.Github = thirdPartyProviders.Github;
Wrapper.Facebook = thirdPartyProviders.Facebook;
Wrapper.Apple = thirdPartyProviders.Apple;
Wrapper.Discord = thirdPartyProviders.Discord;
Wrapper.GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces;
Wrapper.Bitbucket = thirdPartyProviders.Bitbucket;
Wrapper.GitLab = thirdPartyProviders.GitLab;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.signInUp = Wrapper.signInUp;
exports.linkThirdPartyAccountWithUserFromSession = Wrapper.linkThirdPartyAccountWithUserFromSession;
exports.Google = Wrapper.Google;
exports.Github = Wrapper.Github;
exports.Facebook = Wrapper.Facebook;
exports.Apple = Wrapper.Apple;
exports.Discord = Wrapper.Discord;
exports.GoogleWorkspaces = Wrapper.GoogleWorkspaces;
exports.Bitbucket = Wrapper.Bitbucket;
exports.GitLab = Wrapper.GitLab;
