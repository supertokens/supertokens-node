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
import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailVerificationRecipe from "../emailverification/recipe";
import { RecipeInterface as EmailVerificationRecipeInterface } from "../emailverification/types";
import PasswordlessRecipe from "../passwordless/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import STErrorPasswordless from "../passwordless/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import PasswordlessRecipeImplementation from "./recipeImplementation/passwordlessRecipeImplementation";
import ThirdPartyRecipeImplementation from "./recipeImplementation/thirdPartyRecipeImplementation";
import getThirdPartyIterfaceImpl from "./api/thirdPartyAPIImplementation";
import getPasswordlessIterfaceImpl from "./api/passwordlessAPIImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import OverrideableBuilder from "supertokens-js-override";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdpartypasswordless";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    passwordlessRecipe: PasswordlessRecipe;

    private thirdPartyRecipe: ThirdPartyRecipe | undefined;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            emailVerificationInstance: EmailVerificationRecipe | undefined;
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            passwordlessInstance: PasswordlessRecipe | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(
                    Querier.getNewInstanceOrThrowError(PasswordlessRecipe.RECIPE_ID),
                    Querier.getNewInstanceOrThrowError(ThirdPartyRecipe.RECIPE_ID)
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        const recipImplReference = this.recipeInterfaceImpl;
        const emailVerificationConfig = this.config.emailVerificationFeature;

        this.emailVerificationRecipe =
            recipes.emailVerificationInstance !== undefined
                ? recipes.emailVerificationInstance
                : new EmailVerificationRecipe(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      {
                          ...this.config.emailVerificationFeature,
                          override: {
                              ...this.config.emailVerificationFeature.override,
                              functions: (oI, builder) => {
                                  let passwordlessOverride = (
                                      oI: EmailVerificationRecipeInterface
                                  ): EmailVerificationRecipeInterface => {
                                      return {
                                          ...oI,
                                          createEmailVerificationToken: async function (input) {
                                              let user = await recipImplReference.getUserById({
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
                                          },
                                          isEmailVerified: async function (input) {
                                              let user = await recipImplReference.getUserById({
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
                                          },
                                      };
                                  };
                                  if (emailVerificationConfig.override?.functions !== undefined) {
                                      // First we apply the override from what we have above,
                                      // and then we apply their override. Notice that we don't
                                      // pass in oI in here, but that is OK since that's how the
                                      // override works!
                                      return builder!
                                          .override(passwordlessOverride)
                                          .override(emailVerificationConfig.override.functions)
                                          .build();
                                  }
                                  return passwordlessOverride(oI);
                              },
                          },
                      },
                      {
                          emailDelivery: undefined,
                      }
                  );

        this.passwordlessRecipe =
            recipes.passwordlessInstance !== undefined
                ? recipes.passwordlessInstance
                : new PasswordlessRecipe(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      {
                          ...this.config,
                          override: {
                              functions: (_) => {
                                  return PasswordlessRecipeImplementation(this.recipeInterfaceImpl);
                              },
                              apis: (_) => {
                                  return getPasswordlessIterfaceImpl(this.apiImpl);
                              },
                          },
                      },
                      {
                          emailDelivery: undefined,
                      }
                  );

        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe =
                recipes.thirdPartyInstance !== undefined
                    ? recipes.thirdPartyInstance
                    : new ThirdPartyRecipe(
                          recipeId,
                          appInfo,
                          isInServerlessEnv,
                          {
                              override: {
                                  functions: (_) => {
                                      return ThirdPartyRecipeImplementation(this.recipeInterfaceImpl);
                                  },
                                  apis: (_) => {
                                      return getThirdPartyIterfaceImpl(this.apiImpl);
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
                              emailDelivery: undefined,
                          }
                      );
        }
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    passwordlessInstance: undefined,
                    emailVerificationInstance: undefined,
                    thirdPartyInstance: undefined,
                });
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

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    getAPIsHandled = (): APIHandled[] => {
        let apisHandled = [
            ...this.passwordlessRecipe.getAPIsHandled(),
            ...this.emailVerificationRecipe.getAPIsHandled(),
        ];
        if (this.thirdPartyRecipe !== undefined) {
            apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
        }
        return apisHandled;
    };

    handleAPIRequest = async (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ): Promise<boolean> => {
        if (this.passwordlessRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
            return await this.passwordlessRecipe.handleAPIRequest(id, req, res, path, method);
        }
        if (
            this.thirdPartyRecipe !== undefined &&
            this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
        ) {
            return await this.thirdPartyRecipe.handleAPIRequest(id, req, res, path, method);
        }
        return await this.emailVerificationRecipe.handleAPIRequest(id, req, res, path, method);
    };

    handleError = async (
        err: STErrorPasswordless | STErrorThirdParty,
        request: BaseRequest,
        response: BaseResponse
    ): Promise<void> => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            throw err;
        } else {
            if (this.passwordlessRecipe.isErrorFromThisRecipe(err)) {
                return await this.passwordlessRecipe.handleError(err, request, response);
            } else if (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                return await this.thirdPartyRecipe.handleError(err, request, response);
            }
            return await this.emailVerificationRecipe.handleError(err, request, response);
        }
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders = [
            ...this.emailVerificationRecipe.getAllCORSHeaders(),
            ...this.passwordlessRecipe.getAllCORSHeaders(),
        ];
        if (this.thirdPartyRecipe !== undefined) {
            corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
        }
        return corsHeaders;
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (err.fromRecipe === Recipe.RECIPE_ID ||
                this.emailVerificationRecipe.isErrorFromThisRecipe(err) ||
                this.passwordlessRecipe.isErrorFromThisRecipe(err) ||
                (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)))
        );
    };

    // helper functions...

    getEmailForUserIdForEmailVerification = async (userId: string, userContext: any): Promise<string> => {
        let userInfo = await this.recipeInterfaceImpl.getUserById({ userId, userContext });
        if (userInfo === undefined) {
            throw new Error("Unknown User ID provided");
        } else if (!("thirdParty" in userInfo)) {
            // this is a passwordless user.. so we always return some random email,
            // and in the function for isEmailVerified, we will check if the user
            // is a passwordless user, and if they are, we will return true in there
            return "_____supertokens_passwordless_user@supertokens.com";
        }
        return userInfo.email;
    };
}
