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
import { GENERATE_EMAIL_VERIFY_TOKEN_API, EMAIL_VERIFY_API } from "./constants";
import generateEmailVerifyTokenAPI from "./api/generateEmailVerifyToken";
import emailVerifyAPI from "./api/emailVerify";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "emailverification";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.recipeInterfaceImpl = this.config.override.functions(
            new RecipeImplementation(Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipeId))
        );
        this.apiImpl = this.config.override.apis(new APIImplementation());
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
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(GENERATE_EMAIL_VERIFY_TOKEN_API),
                id: GENERATE_EMAIL_VERIFY_TOKEN_API,
                disabled: this.apiImpl.generateEmailVerifyTokenPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.apiImpl.verifyEmailPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.apiImpl.isEmailVerifiedGET === undefined,
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
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };
        if (id === GENERATE_EMAIL_VERIFY_TOKEN_API) {
            return await generateEmailVerifyTokenAPI(this.apiImpl, options);
        } else {
            return await emailVerifyAPI(this.apiImpl, options);
        }
    };

    handleError = (err: STError, _: BaseRequest, __: BaseResponse): void => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
