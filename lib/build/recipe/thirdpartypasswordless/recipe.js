"use strict";
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
const recipeModule_1 = require("../../recipeModule");
const recipe_1 = require("../emailverification/recipe");
const recipe_2 = require("../passwordless/recipe");
const recipe_3 = require("../thirdparty/recipe");
const error_1 = require("./error");
const utils_1 = require("./utils");
const recipeImplementation_1 = require("./recipeImplementation");
const passwordlessRecipeImplementation_1 = require("./recipeImplementation/passwordlessRecipeImplementation");
const thirdPartyRecipeImplementation_1 = require("./recipeImplementation/thirdPartyRecipeImplementation");
const thirdPartyAPIImplementation_1 = require("./api/thirdPartyAPIImplementation");
const passwordlessAPIImplementation_1 = require("./api/passwordlessAPIImplementation");
const implementation_1 = require("./api/implementation");
const querier_1 = require("../../querier");
const supertokens_js_override_1 = require("supertokens-js-override");
const emaildelivery_1 = require("../../ingredients/emaildelivery");
const smsdelivery_1 = require("../../ingredients/smsdelivery");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, recipes, ingredients) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            let apisHandled = [
                ...this.passwordlessRecipe.getAPIsHandled(),
                ...this.emailVerificationRecipe.getAPIsHandled(),
            ];
            if (this.thirdPartyRecipe !== undefined) {
                apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
            }
            return apisHandled;
        };
        this.handleAPIRequest = (id, req, res, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.passwordlessRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
                    return yield this.passwordlessRecipe.handleAPIRequest(id, req, res, path, method);
                }
                if (
                    this.thirdPartyRecipe !== undefined &&
                    this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
                ) {
                    return yield this.thirdPartyRecipe.handleAPIRequest(id, req, res, path, method);
                }
                return yield this.emailVerificationRecipe.handleAPIRequest(id, req, res, path, method);
            });
        this.handleError = (err, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                if (err.fromRecipe === Recipe.RECIPE_ID) {
                    throw err;
                } else {
                    if (this.passwordlessRecipe.isErrorFromThisRecipe(err)) {
                        return yield this.passwordlessRecipe.handleError(err, request, response);
                    } else if (
                        this.thirdPartyRecipe !== undefined &&
                        this.thirdPartyRecipe.isErrorFromThisRecipe(err)
                    ) {
                        return yield this.thirdPartyRecipe.handleError(err, request, response);
                    }
                    return yield this.emailVerificationRecipe.handleError(err, request, response);
                }
            });
        this.getAllCORSHeaders = () => {
            let corsHeaders = [
                ...this.emailVerificationRecipe.getAllCORSHeaders(),
                ...this.passwordlessRecipe.getAllCORSHeaders(),
            ];
            if (this.thirdPartyRecipe !== undefined) {
                corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
            }
            return corsHeaders;
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (err.fromRecipe === Recipe.RECIPE_ID ||
                    this.emailVerificationRecipe.isErrorFromThisRecipe(err) ||
                    this.passwordlessRecipe.isErrorFromThisRecipe(err) ||
                    (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)))
            );
        };
        // helper functions...
        this.getEmailForUserIdForEmailVerification = (userId, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.recipeInterfaceImpl.getUserById({ userId, userContext });
                if (userInfo === undefined) {
                    throw new Error("Unknown User ID provided");
                } else if (!("thirdParty" in userInfo)) {
                    // this is a passwordless user
                    if (userInfo.email !== undefined) {
                        return userInfo.email;
                    } else {
                        // this is a passwordless user with only a phone number.
                        // returning an empty string here is not a problem since
                        // we override the email verification functions above to
                        // send that the email is already verified for passwordless users.
                        return "";
                    }
                } else {
                    // third party user
                    return userInfo.email;
                }
            });
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(
                    querier_1.Querier.getNewInstanceOrThrowError(recipe_2.default.RECIPE_ID),
                    querier_1.Querier.getNewInstanceOrThrowError(recipe_3.default.RECIPE_ID)
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        const recipeImplReference = this.recipeInterfaceImpl;
        const emailVerificationConfig = this.config.emailVerificationFeature;
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new emaildelivery_1.default(
                      this.config.getEmailDeliveryConfig(this.recipeInterfaceImpl, this.isInServerlessEnv)
                  )
                : ingredients.emailDelivery;
        this.smsDelivery =
            ingredients.smsDelivery === undefined
                ? new smsdelivery_1.default(this.config.getSmsDeliveryConfig())
                : ingredients.smsDelivery;
        this.emailVerificationRecipe =
            recipes.emailVerificationInstance !== undefined
                ? recipes.emailVerificationInstance
                : new recipe_1.default(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      Object.assign(Object.assign({}, this.config.emailVerificationFeature), {
                          override: Object.assign(Object.assign({}, this.config.emailVerificationFeature.override), {
                              functions: (oI, builder) => {
                                  var _a;
                                  let passwordlessOverride = (oI) => {
                                      return Object.assign(Object.assign({}, oI), {
                                          createEmailVerificationToken: function (input) {
                                              return __awaiter(this, void 0, void 0, function* () {
                                                  let user = yield recipeImplReference.getUserById({
                                                      userId: input.userId,
                                                      userContext: input.userContext,
                                                  });
                                                  if (user === undefined || "thirdParty" in user) {
                                                      return oI.createEmailVerificationToken(input);
                                                  } else {
                                                      return {
                                                          status: "EMAIL_ALREADY_VERIFIED_ERROR",
                                                      };
                                                  }
                                              });
                                          },
                                          isEmailVerified: function (input) {
                                              return __awaiter(this, void 0, void 0, function* () {
                                                  let user = yield recipeImplReference.getUserById({
                                                      userId: input.userId,
                                                      userContext: input.userContext,
                                                  });
                                                  if (user === undefined || "thirdParty" in user) {
                                                      return oI.isEmailVerified(input);
                                                  } else {
                                                      // this is a passwordless user, so we always want
                                                      // to return that their info / email is verified
                                                      return true;
                                                  }
                                              });
                                          },
                                      });
                                  };
                                  if (
                                      ((_a = emailVerificationConfig.override) === null || _a === void 0
                                          ? void 0
                                          : _a.functions) !== undefined
                                  ) {
                                      // First we apply the override from what we have above,
                                      // and then we apply their override. Notice that we don't
                                      // pass in oI in here, but that is OK since that's how the
                                      // override works!
                                      return builder
                                          .override(passwordlessOverride)
                                          .override(emailVerificationConfig.override.functions)
                                          .build();
                                  }
                                  return passwordlessOverride(oI);
                              },
                          }),
                      }),
                      {
                          emailDelivery: this.emailDelivery,
                      }
                  );
        this.passwordlessRecipe =
            recipes.passwordlessInstance !== undefined
                ? recipes.passwordlessInstance
                : new recipe_2.default(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      Object.assign(Object.assign({}, this.config), {
                          override: {
                              functions: (_) => {
                                  return passwordlessRecipeImplementation_1.default(this.recipeInterfaceImpl);
                              },
                              apis: (_) => {
                                  return passwordlessAPIImplementation_1.default(this.apiImpl);
                              },
                          },
                      }),
                      {
                          emailDelivery: this.emailDelivery,
                          smsDelivery: this.smsDelivery,
                      }
                  );
        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe =
                recipes.thirdPartyInstance !== undefined
                    ? recipes.thirdPartyInstance
                    : new recipe_3.default(
                          recipeId,
                          appInfo,
                          isInServerlessEnv,
                          {
                              override: {
                                  functions: (_) => {
                                      return thirdPartyRecipeImplementation_1.default(this.recipeInterfaceImpl);
                                  },
                                  apis: (_) => {
                                      return thirdPartyAPIImplementation_1.default(this.apiImpl);
                                  },
                              },
                              signInAndUpFeature: {
                                  providers: this.config.providers,
                              },
                          },
                          {
                              emailVerificationInstance: this.emailVerificationRecipe,
                          },
                          {
                              emailDelivery: this.emailDelivery,
                          }
                      );
        }
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {
                        passwordlessInstance: undefined,
                        emailVerificationInstance: undefined,
                        thirdPartyInstance: undefined,
                    },
                    {
                        emailDelivery: undefined,
                        smsDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error(
                    "ThirdPartyPasswordless recipe has already been initialised. Please check your code for bugs."
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdpartypasswordless";
