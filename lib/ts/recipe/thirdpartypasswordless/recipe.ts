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
import PasswordlessRecipe from "../passwordless/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import type { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
    TypeThirdPartyPasswordlessSmsDeliveryInput,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import STErrorPasswordless from "../passwordless/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import PasswordlessRecipeImplementation from "./recipeImplementation/passwordlessRecipeImplementation";
import ThirdPartyRecipeImplementation from "./recipeImplementation/thirdPartyRecipeImplementation";
import getThirdPartyIterfaceImpl from "./api/thirdPartyAPIImplementation";
import getPasswordlessInterfaceImpl from "./api/passwordlessAPIImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import OverrideableBuilder from "supertokens-js-override";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdpartypasswordless";

    config: TypeNormalisedInput;

    passwordlessRecipe: PasswordlessRecipe;

    private thirdPartyRecipe: ThirdPartyRecipe;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    emailDelivery: EmailDeliveryIngredient<TypeThirdPartyPasswordlessEmailDeliveryInput>;

    smsDelivery: SmsDeliveryIngredient<TypeThirdPartyPasswordlessSmsDeliveryInput>;

    isInServerlessEnv: boolean;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            passwordlessInstance: PasswordlessRecipe | undefined;
        },
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeThirdPartyPasswordlessEmailDeliveryInput> | undefined;
            smsDelivery: SmsDeliveryIngredient<TypeThirdPartyPasswordlessSmsDeliveryInput> | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(appInfo, config);

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(
                    Querier.getNewInstanceOrThrowError(PasswordlessRecipe.RECIPE_ID),
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

        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new EmailDeliveryIngredient(
                      this.config.getEmailDeliveryConfig(this.recipeInterfaceImpl, this.isInServerlessEnv)
                  )
                : ingredients.emailDelivery;

        this.smsDelivery =
            ingredients.smsDelivery === undefined
                ? new SmsDeliveryIngredient(this.config.getSmsDeliveryConfig())
                : ingredients.smsDelivery;

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
                                  return getPasswordlessInterfaceImpl(this.apiImpl);
                              },
                          },
                      },
                      {
                          emailDelivery: this.emailDelivery,
                          smsDelivery: this.smsDelivery,
                      }
                  );

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

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {
                        passwordlessInstance: undefined,
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

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    getAPIsHandled = (): APIHandled[] => {
        let apisHandled = [...this.passwordlessRecipe.getAPIsHandled()];
        apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
        return apisHandled;
    };

    handleAPIRequest = async (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: Record<string, any>
    ): Promise<boolean> => {
        if ((await this.passwordlessRecipe.returnAPIIdIfCanHandleRequest(path, method, userContext)) !== undefined) {
            return await this.passwordlessRecipe.handleAPIRequest(id, tenantId, req, res, path, method, userContext);
        }
        if ((await this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method, userContext)) !== undefined) {
            return await this.thirdPartyRecipe.handleAPIRequest(id, tenantId, req, res, path, method, userContext);
        }
        return false;
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
            } else if (this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                return await this.thirdPartyRecipe.handleError(err, request, response);
            }
            throw err;
        }
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders = [...this.passwordlessRecipe.getAllCORSHeaders()];
        corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
        return corsHeaders;
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (err.fromRecipe === Recipe.RECIPE_ID ||
                this.passwordlessRecipe.isErrorFromThisRecipe(err) ||
                this.thirdPartyRecipe.isErrorFromThisRecipe(err))
        );
    };
}
