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
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import * as express from "express";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, User, RecipeInterface, APIInterface } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import EmailPasswordRecipeImplementation from "./recipeImplementation/emailPasswordRecipeImplementation";
import ThirdPartyRecipeImplementation from "./recipeImplementation/thirdPartyRecipeImplementation";
import getThirdPartyIterfaceImpl from "./api/thirdPartyAPIImplementation";
import getEmailPasswordIterfaceImpl from "./api/emailPasswordAPIImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdpartyemailpassword";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    private emailPasswordRecipe: EmailPasswordRecipe;

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
            emailPasswordInstance: EmailPasswordRecipe | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        this.recipeInterfaceImpl = this.config.override.functions(
            new RecipeImplementation(
                Querier.getNewInstanceOrThrowError(isInServerlessEnv, EmailPasswordRecipe.RECIPE_ID),
                Querier.getNewInstanceOrThrowError(isInServerlessEnv, ThirdPartyRecipe.RECIPE_ID)
            )
        );

        this.apiImpl = this.config.override.apis(new APIImplementation());

        this.emailVerificationRecipe =
            recipes.emailVerificationInstance !== undefined
                ? recipes.emailVerificationInstance
                : new EmailVerificationRecipe(recipeId, appInfo, isInServerlessEnv, {
                      ...this.config.emailVerificationFeature,
                      override: this.config.override.emailVerificationFeature,
                  });

        this.emailPasswordRecipe =
            recipes.emailPasswordInstance !== undefined
                ? recipes.emailPasswordInstance
                : new EmailPasswordRecipe(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      {
                          override: {
                              functions: (_) => {
                                  return new EmailPasswordRecipeImplementation(this.recipeInterfaceImpl);
                              },
                              apis: (_) => {
                                  return getEmailPasswordIterfaceImpl(this.apiImpl);
                              },
                          },
                          sessionFeature: {
                              setJwtPayload: async (user, formfields, action) => {
                                  return this.config.sessionFeature.setJwtPayload(
                                      user,
                                      {
                                          loginType: "emailpassword",
                                          formFields: formfields,
                                      },
                                      action
                                  );
                              },
                              setSessionData: async (user, formfields, action) => {
                                  return this.config.sessionFeature.setSessionData(
                                      user,
                                      {
                                          loginType: "emailpassword",
                                          formFields: formfields,
                                      },
                                      action
                                  );
                              },
                          },
                          signUpFeature: {
                              formFields: this.config.signUpFeature.formFields,
                          },
                          resetPasswordUsingTokenFeature: this.config.resetPasswordUsingTokenFeature,
                      },
                      { emailVerificationInstance: this.emailVerificationRecipe }
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
                                      return new ThirdPartyRecipeImplementation(this.recipeInterfaceImpl);
                                  },
                                  apis: (_) => {
                                      return getThirdPartyIterfaceImpl(this.apiImpl);
                                  },
                              },
                              sessionFeature: {
                                  setJwtPayload: async (user, thirdPartyAuthCodeResponse, action) => {
                                      return this.config.sessionFeature.setJwtPayload(
                                          user,
                                          {
                                              loginType: "thirdparty",
                                              thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                          },
                                          action
                                      );
                                  },
                                  setSessionData: async (user, thirdPartyAuthCodeResponse, action) => {
                                      return this.config.sessionFeature.setSessionData(
                                          user,
                                          {
                                              loginType: "thirdparty",
                                              thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                          },
                                          action
                                      );
                                  },
                              },
                              signInAndUpFeature: {
                                  providers: this.config.providers,
                              },
                          },
                          {
                              emailVerificationInstance: this.emailVerificationRecipe,
                          }
                      );
        }
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailPasswordInstance: undefined,
                    emailVerificationInstance: undefined,
                    thirdPartyInstance: undefined,
                });
                return Recipe.instance;
            } else {
                throw new Error(
                    "ThirdPartyEmailPassword recipe has already been initialised. Please check your code for bugs."
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
            ...this.emailPasswordRecipe.getAPIsHandled(),
            ...this.emailVerificationRecipe.getAPIsHandled(),
        ];
        if (this.thirdPartyRecipe !== undefined) {
            apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
        }
        return apisHandled;
    };

    handleAPIRequest = async (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => {
        if (this.emailPasswordRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
            return await this.emailPasswordRecipe.handleAPIRequest(id, req, res, next, path, method);
        }
        if (
            this.thirdPartyRecipe !== undefined &&
            this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
        ) {
            return await this.thirdPartyRecipe.handleAPIRequest(id, req, res, next, path, method);
        }
        return await this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
    };

    handleError = (
        err: STErrorEmailPassword | STErrorThirdParty,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            next(err);
        } else {
            if (this.emailPasswordRecipe.isErrorFromThisRecipe(err)) {
                return this.emailPasswordRecipe.handleError(err, request, response, next);
            } else if (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                return this.thirdPartyRecipe.handleError(err, request, response, next);
            }
            return this.emailVerificationRecipe.handleError(err, request, response, next);
        }
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders = [
            ...this.emailVerificationRecipe.getAllCORSHeaders(),
            ...this.emailPasswordRecipe.getAllCORSHeaders(),
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
                this.emailPasswordRecipe.isErrorFromThisRecipe(err) ||
                (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)))
        );
    };

    // helper functions...

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.recipeInterfaceImpl.getUserById(userId);
        if (userInfo === undefined) {
            throw new Error("Unknown User ID provided");
        }
        return userInfo.email;
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return this.emailVerificationRecipe.createEmailVerificationToken(userId, await this.getEmailForUserId(userId));
    };

    verifyEmailUsingToken = async (token: string): Promise<User> => {
        let user = await this.emailVerificationRecipe.verifyEmailUsingToken(token);
        let userInThisRecipe = await this.recipeInterfaceImpl.getUserById(user.id);
        if (userInThisRecipe === undefined) {
            throw new Error("Unknown User ID provided");
        }
        return userInThisRecipe;
    };

    isEmailVerified = async (userId: string) => {
        return this.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified(
            userId,
            await this.getEmailForUserId(userId)
        );
    };
}
