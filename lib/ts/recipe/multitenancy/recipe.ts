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

import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import SessionRecipe from "../session/recipe";
import { ProviderInput } from "../thirdparty/types";
import { LOGIN_METHODS_API } from "./constants";
import { AllowedDomainsClaim } from "./multitenancyClaim";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import loginMethodsAPI from "./api/loginMethods";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "multitenancy";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    staticThirdPartyProviders: ProviderInput[] = [];

    getAllowedDomainsForTenantId?: (
        tenantId: string | undefined,
        userContext: any
    ) => Promise<{
        status: "OK";
        domains: string[];
    }>;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }

        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        this.getAllowedDomainsForTenantId = this.config.getAllowedDomainsForTenantId;
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);

                if (Recipe.instance.getAllowedDomainsForTenantId !== undefined) {
                    PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                        try {
                            SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(AllowedDomainsClaim);
                        } catch {
                            // Skip adding claims if session recipe is not initialised
                        }
                    });
                }

                return Recipe.instance;
            } else {
                throw new Error("Multitenancy recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_METHODS_API),
                id: LOGIN_METHODS_API,
                disabled: this.apiImpl.loginMethodsGET === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod
    ): Promise<boolean> => {
        let options = {
            recipeImplementation: this.recipeInterfaceImpl,
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            req,
            res,
            staticThirdPartyProviders: this.staticThirdPartyProviders,
        };
        if (id === LOGIN_METHODS_API) {
            return await loginMethodsAPI(this.apiImpl, options);
        }
        throw new Error("should never come here");
    };

    handleError = async (err: STError, req: BaseRequest, res: BaseResponse): Promise<void> => {
        if (err.type === "RECIPE_DISABLED_FOR_TENANT_ERROR") {
            return await this.config.errorHandlers.onRecipeDisabledForTenantError(err.message, req, res);
        } else if (err.type === "TENANT_DOES_NOT_EXIST_ERROR") {
            return await this.config.errorHandlers.onTenantDoesNotExistError(err.message, req, res);
        }
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
