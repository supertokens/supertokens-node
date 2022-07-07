/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { APIInterface, APIOptions, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { validateAndNormaliseUserInput } from "./utils";
import { DASHBOARD_API } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { BaseRequest, BaseResponse } from "../../framework";
import dashboard from "./api/dashboard";
import error from "../../error";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "dashboard";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput) {
        super(recipeId, appInfo);

        this.config = validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation());
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

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error(
                    "Emailverification recipe has already been initialised. Please check your code for bugs."
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

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DASHBOARD_API),
                id: DASHBOARD_API,
                disabled: this.apiImpl.dashboardGET === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        _: string,
        req: BaseRequest,
        res: BaseResponse,
        __: NormalisedURLPath,
        ___: HTTPMethod
    ): Promise<boolean> => {
        let options: APIOptions = {
            config: this.config,
            recipeId: this.getRecipeId(),
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
            isInServerlessEnv: this.isInServerlessEnv,
        };

        return await dashboard(this.apiImpl, options);
    };

    handleError = async (err: error, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is error => {
        return error.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };

    returnAPIIdIfCanHandleRequest = (path: NormalisedURLPath, method: HTTPMethod): string | undefined => {
        const dashboardBundlePath = this.getAppInfo().apiBasePath.appendPath(new NormalisedURLPath(DASHBOARD_API));
        const dashboardAPIPath = dashboardBundlePath.appendPath(new NormalisedURLPath("/api"));

        if (path.startsWith(dashboardAPIPath)) {
            // TODO NEMI: Handle api routing
            return undefined;
        }

        if (path.startsWith(dashboardBundlePath)) {
            return DASHBOARD_API;
        }

        return super.returnAPIIdIfCanHandleRequest(path, method);
    };
}
