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

import SuperTokensError from "../../error";
import error from "../../error";
import { BaseRequest } from "../../framework/request";
import { BaseResponse } from "../../framework/response";
import NormalisedURLPath from "../../normalisedURLPath";
import normalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import getJWKS from "./api/getJWKS";
import APIImplementation from "./api/implementation";
import { GET_JWKS_API } from "./constants";
import RecipeImplementation from "./recipeImplementation";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";

export default class Recipe extends RecipeModule {
    static RECIPE_ID = "jwt";
    private static instance: Recipe | undefined = undefined;

    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), this.config, appInfo)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    /* Init functions */

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("JWT recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    /* RecipeModule functions */

    getAPIsHandled(): APIHandled[] {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(GET_JWKS_API),
                id: GET_JWKS_API,
                disabled: this.apiImpl.getJWKSGET === undefined,
            },
        ];
    }

    handleAPIRequest = async (
        _: string,
        req: BaseRequest,
        res: BaseResponse,
        __: normalisedURLPath,
        ___: HTTPMethod
    ): Promise<boolean> => {
        let options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };

        return await getJWKS(this.apiImpl, options);
    };

    handleError(error: error, _: BaseRequest, __: BaseResponse): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
