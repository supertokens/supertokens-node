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
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { APIInterface, APIOptions, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import NormalisedURLPath from "../../normalisedURLPath";
import { GET_DISCOVERY_CONFIG_URL } from "./constants";
import getOpenIdDiscoveryConfiguration from "./api/getOpenIdDiscoveryConfiguration";
import { applyPlugins, isTestEnv } from "../../utils";

export default class OpenIdRecipe extends RecipeModule {
    static RECIPE_ID = "openid" as const;
    private static instance: OpenIdRecipe | undefined = undefined;
    config: TypeNormalisedInput;
    recipeImplementation: RecipeInterface;
    apiImpl: APIInterface;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput) {
        super(recipeId, appInfo);

        this.config = validateAndNormaliseUserInput(config);

        let builder = new OverrideableBuilder(RecipeImplementation(appInfo));

        this.recipeImplementation = builder.override(this.config.override.functions).build();

        let apiBuilder = new OverrideableBuilder(APIImplementation());

        this.apiImpl = apiBuilder.override(this.config.override.apis).build();
    }

    static getInstanceOrThrowError(): OpenIdRecipe {
        if (OpenIdRecipe.instance !== undefined) {
            return OpenIdRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Openid.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, _isInServerlessEnv, plugins) => {
            if (OpenIdRecipe.instance === undefined) {
                OpenIdRecipe.instance = new OpenIdRecipe(
                    OpenIdRecipe.RECIPE_ID,
                    appInfo,
                    applyPlugins(OpenIdRecipe.RECIPE_ID, config as any, plugins ?? [])
                );
                return OpenIdRecipe.instance;
            } else {
                throw new Error("OpenId recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (!isTestEnv()) {
            throw new Error("calling testing function in non testing env");
        }
        OpenIdRecipe.instance = undefined;
    }

    static async getIssuer(userContext: UserContext) {
        return (
            await this.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext })
        ).issuer;
    }

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(GET_DISCOVERY_CONFIG_URL),
                id: GET_DISCOVERY_CONFIG_URL,
                disabled: this.apiImpl.getOpenIdDiscoveryConfigurationGET === undefined,
            },
        ];
    };
    handleAPIRequest = async (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let apiOptions: APIOptions = {
            recipeImplementation: this.recipeImplementation,
            config: this.config,
            recipeId: this.getRecipeId(),
            req,
            res: response,
        };

        if (id === GET_DISCOVERY_CONFIG_URL) {
            return await getOpenIdDiscoveryConfiguration(this.apiImpl, apiOptions, userContext);
        } else {
            return false;
        }
    };
    handleError = async (error: STError): Promise<void> => {
        throw error;
    };
    getAllCORSHeaders = (): string[] => {
        return [];
    };
    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === OpenIdRecipe.RECIPE_ID;
    };
}
