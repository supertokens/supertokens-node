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
import STError from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { APIInterface, APIOptions, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import JWTRecipe from "../jwt/recipe";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import NormalisedURLPath from "../../normalisedURLPath";
import { GET_DISCOVERY_CONFIG_URL } from "./constants";
import getOpenIdDiscoveryConfiguration from "./api/getOpenIdDiscoveryConfiguration";

export default class OpenIdRecipe extends RecipeModule {
    static RECIPE_ID = "openid";
    private static instance: OpenIdRecipe | undefined = undefined;
    config: TypeNormalisedInput;
    jwtRecipe: JWTRecipe;
    recipeImplementation: RecipeInterface;
    apiImpl: APIInterface;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);

        this.config = validateAndNormaliseUserInput(appInfo, config);
        this.jwtRecipe = new JWTRecipe(recipeId, appInfo, isInServerlessEnv, {
            jwtValiditySeconds: this.config.jwtValiditySeconds,
            override: this.config.override.jwtFeature,
        });

        let builder = new OverrideableBuilder(RecipeImplementation(this.config, this.jwtRecipe.recipeInterfaceImpl));

        this.recipeImplementation = builder.override(this.config.override.functions).build();

        let apiBuilder = new OverrideableBuilder(APIImplementation());

        this.apiImpl = apiBuilder.override(this.config.override.apis).build();
    }

    static getInstanceOrThrowError(): OpenIdRecipe {
        if (OpenIdRecipe.instance !== undefined) {
            return OpenIdRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (OpenIdRecipe.instance === undefined) {
                OpenIdRecipe.instance = new OpenIdRecipe(OpenIdRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return OpenIdRecipe.instance;
            } else {
                throw new Error("OpenId recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        OpenIdRecipe.instance = undefined;
    }

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(GET_DISCOVERY_CONFIG_URL),
                id: GET_DISCOVERY_CONFIG_URL,
                disabled: this.apiImpl.getOpenIdDiscoveryConfigurationGET === undefined,
            },
            ...this.jwtRecipe.getAPIsHandled(),
        ];
    };
    handleAPIRequest = async (
        id: string,
        tenantId: string | undefined,
        req: BaseRequest,
        response: BaseResponse,
        path: normalisedURLPath,
        method: HTTPMethod
    ): Promise<boolean> => {
        let apiOptions: APIOptions = {
            recipeImplementation: this.recipeImplementation,
            config: this.config,
            recipeId: this.getRecipeId(),
            req,
            res: response,
        };

        if (id === GET_DISCOVERY_CONFIG_URL) {
            return await getOpenIdDiscoveryConfiguration(this.apiImpl, apiOptions);
        } else {
            return this.jwtRecipe.handleAPIRequest(id, tenantId, req, response, path, method);
        }
    };
    handleError = async (error: STError, request: BaseRequest, response: BaseResponse): Promise<void> => {
        if (error.fromRecipe === OpenIdRecipe.RECIPE_ID) {
            throw error;
        } else {
            return await this.jwtRecipe.handleError(error, request, response);
        }
    };
    getAllCORSHeaders = (): string[] => {
        return [...this.jwtRecipe.getAllCORSHeaders()];
    };
    isErrorFromThisRecipe = (err: any): err is STError => {
        return (
            (STError.isErrorFromSuperTokens(err) && err.fromRecipe === OpenIdRecipe.RECIPE_ID) ||
            this.jwtRecipe.isErrorFromThisRecipe(err)
        );
    };
}
