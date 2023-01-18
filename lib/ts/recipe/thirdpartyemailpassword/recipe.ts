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
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    TypeThirdPartyEmailPasswordEmailDeliveryInput,
} from "./types";
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
import OverrideableBuilder from "supertokens-js-override";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdpartyemailpassword";

    config: TypeNormalisedInput;

    private emailPasswordRecipe: EmailPasswordRecipe;

    private thirdPartyRecipe: ThirdPartyRecipe | undefined;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    emailDelivery: EmailDeliveryIngredient<TypeThirdPartyEmailPasswordEmailDeliveryInput>;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            emailPasswordInstance: EmailPasswordRecipe | undefined;
        },
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeThirdPartyEmailPasswordEmailDeliveryInput> | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(
                    Querier.getNewInstanceOrThrowError(EmailPasswordRecipe.RECIPE_ID),
                    Querier.getNewInstanceOrThrowError(ThirdPartyRecipe.RECIPE_ID),
                    this.config.providers
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        let emailPasswordRecipeImplementation = EmailPasswordRecipeImplementation(this.recipeInterfaceImpl);
        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new EmailDeliveryIngredient(
                      this.config.getEmailDeliveryConfig(emailPasswordRecipeImplementation, this.isInServerlessEnv)
                  )
                : ingredients.emailDelivery;

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
                                  return emailPasswordRecipeImplementation;
                              },
                              apis: (_) => {
                                  return getEmailPasswordIterfaceImpl(this.apiImpl);
                              },
                          },
                          signUpFeature: {
                              formFields: this.config.signUpFeature.formFields,
                          },
                          resetPasswordUsingTokenFeature: this.config.resetPasswordUsingTokenFeature,
                      },
                      {
                          emailDelivery: this.emailDelivery,
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
                          {},
                          {
                              emailDelivery: this.emailDelivery,
                          }
                      );
        }
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {
                        emailPasswordInstance: undefined,
                        thirdPartyInstance: undefined,
                    },
                    {
                        emailDelivery: undefined,
                    }
                );
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
        let apisHandled = [...this.emailPasswordRecipe.getAPIsHandled()];
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
        if (this.emailPasswordRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
            return await this.emailPasswordRecipe.handleAPIRequest(id, req, res, path, method);
        }
        if (
            this.thirdPartyRecipe !== undefined &&
            this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
        ) {
            return await this.thirdPartyRecipe.handleAPIRequest(id, req, res, path, method);
        }
        return false;
    };

    handleError = async (
        err: STErrorEmailPassword | STErrorThirdParty,
        request: BaseRequest,
        response: BaseResponse
    ): Promise<void> => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            throw err;
        } else {
            if (this.emailPasswordRecipe.isErrorFromThisRecipe(err)) {
                return await this.emailPasswordRecipe.handleError(err, request, response);
            } else if (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                return await this.thirdPartyRecipe.handleError(err, request, response);
            }
            throw err;
        }
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders = [...this.emailPasswordRecipe.getAllCORSHeaders()];
        if (this.thirdPartyRecipe !== undefined) {
            corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
        }
        return corsHeaders;
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (err.fromRecipe === Recipe.RECIPE_ID ||
                this.emailPasswordRecipe.isErrorFromThisRecipe(err) ||
                (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)))
        );
    };
}
