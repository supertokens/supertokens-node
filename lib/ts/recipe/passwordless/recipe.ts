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
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "passwordless";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined
    ) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

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
                throw new Error("Passwordless recipe has already been initialised. Please check your code for bugs.");
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
            // TODO:
        ];
    };

    handleAPIRequest = async (
        _: string,
        __: BaseRequest,
        ___: BaseResponse,
        ____: NormalisedURLPath,
        _____: HTTPMethod
    ): Promise<boolean> => {
        // const options = {
        //     config: this.config,
        //     recipeId: this.getRecipeId(),
        //     isInServerlessEnv: this.isInServerlessEnv,
        //     recipeImplementation: this.recipeInterfaceImpl,
        //     req,
        //     res,
        // };
        // TODO:
        return false;
    };

    handleError = async (err: STError, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
