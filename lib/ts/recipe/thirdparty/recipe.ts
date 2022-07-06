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
import { TypeInput, TypeNormalisedInput, TypeProvider, RecipeInterface, APIInterface } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import EmailVerificationRecipe from "../emailverification/recipe";
import STError from "./error";

import { SIGN_IN_UP_API, AUTHORISATION_API, APPLE_REDIRECT_HANDLER } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import signInUpAPI from "./api/signinup";
import authorisationUrlAPI from "./api/authorisationUrl";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import appleRedirectHandler from "./api/appleRedirect";
import OverrideableBuilder from "supertokens-js-override";
import { BootstrapService } from "../../bootstrapService";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdparty";

    config: TypeNormalisedInput;

    providers: TypeProvider[];

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        _recipes: {},
        _ingredients: {}
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        this.providers = this.config.signInAndUpFeature.providers;

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        BootstrapService.addBootstrapCallback(() => {
            const emailVerificationRecipe = EmailVerificationRecipe.getInstance();
            if (emailVerificationRecipe !== undefined) {
                emailVerificationRecipe.addGetEmailForUserIdFunc(this.getEmailForUserId.bind(this));
            }
            // TODO: add equivalent of overrides (make passwordless stuff automatically verified)
        });
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {},
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("ThirdParty recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGN_IN_UP_API),
                id: SIGN_IN_UP_API,
                disabled: this.apiImpl.signInUpPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(AUTHORISATION_API),
                id: AUTHORISATION_API,
                disabled: this.apiImpl.authorisationUrlGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(APPLE_REDIRECT_HANDLER),
                id: APPLE_REDIRECT_HANDLER,
                disabled: this.apiImpl.appleRedirectHandlerPOST === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean> => {
        let options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            providers: this.providers,
            req,
            res,
            appInfo: this.getAppInfo(),
        };
        if (id === SIGN_IN_UP_API) {
            return await signInUpAPI(this.apiImpl, options);
        } else if (id === AUTHORISATION_API) {
            return await authorisationUrlAPI(this.apiImpl, options);
        } else if (id === APPLE_REDIRECT_HANDLER) {
            return await appleRedirectHandler(this.apiImpl, options);
        }
        return false;
    };

    handleError = async (err: STError, _request: BaseRequest, _response: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };

    // helper functions...

    getEmailForUserId = async (userId: string, userContext: any) => {
        let userInfo = await this.recipeInterfaceImpl.getUserById({ userId, userContext });
        if (userInfo === undefined) {
            throw Error("Unknown User ID provided");
        }
        return userInfo.email;
    };
}
