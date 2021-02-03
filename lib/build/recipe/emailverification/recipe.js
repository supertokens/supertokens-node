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
const recipeModule_1 = require("../../recipeModule");
const error_1 = require("./error");
const utils_1 = require("./utils");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const constants_1 = require("./constants");
const coreAPICalls_1 = require("./coreAPICalls");
const utils_2 = require("../../utils");
const generateEmailVerifyToken_1 = require("./api/generateEmailVerifyToken");
const emailVerify_1 = require("./api/emailVerify");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        this.getRecipeId(),
                        constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API
                    ),
                    id: constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API,
                    disabled: this.config.disableDefaultImplementation,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        this.getRecipeId(),
                        constants_1.EMAIL_VERIFY_API
                    ),
                    id: constants_1.EMAIL_VERIFY_API,
                    disabled: this.config.disableDefaultImplementation,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        this.getRecipeId(),
                        constants_1.EMAIL_VERIFY_API
                    ),
                    id: constants_1.EMAIL_VERIFY_API,
                    disabled: this.config.disableDefaultImplementation,
                },
            ];
        };
        this.handleAPIRequest = (id, req, res, next) =>
            __awaiter(this, void 0, void 0, function* () {
                if (id === constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API) {
                    return yield generateEmailVerifyToken_1.default(this, req, res, next);
                } else {
                    return yield emailVerify_1.default(this, req, res, next);
                }
            });
        this.handleError = (err, request, response, next) => {
            if (err.type === error_1.default.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR) {
                return utils_2.send200Response(response, {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                });
            } else if (err.type === error_1.default.EMAIL_ALREADY_VERIFIED_ERROR) {
                return utils_2.send200Response(response, {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                });
            } else {
                return next(err);
            }
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        // instance functions below...............
        this.createEmailVerificationToken = (userId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.createEmailVerificationToken(this, userId, email);
            });
        this.verifyEmailUsingToken = (token) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.verifyEmailUsingToken(this, token);
            });
        this.isEmailVerified = (userId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.isEmailVerified(this, userId, email);
            });
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            Recipe.RECIPE_ID
        );
    }
    static init(config) {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error(
                            "Emailverification recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    Recipe.RECIPE_ID
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                Recipe.RECIPE_ID
            );
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "emailverification";
//# sourceMappingURL=recipe.js.map
