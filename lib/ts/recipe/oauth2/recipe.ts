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
import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import authGET from "./api/auth";
import consentAPI from "./api/consent";
import APIImplementation from "./api/implementation";
import loginAPI from "./api/login";
import logoutAPI from "./api/logout";
import tokenPOST from "./api/token";
import loginInfoGET from "./api/loginInfo";
import { AUTH_PATH, CONSENT_PATH, LOGIN_INFO_PATH, LOGIN_PATH, LOGOUT_PATH, TOKEN_PATH } from "./constants";
import RecipeImplementation from "./recipeImplementation";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";

export default class Recipe extends RecipeModule {
    static RECIPE_ID = "oauth2";
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

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }
    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Jwt.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("OAuth2 recipe has already been initialised. Please check your code for bugs.");
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
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_PATH),
                id: LOGIN_PATH,
                disabled: this.apiImpl.loginPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_PATH),
                id: LOGIN_PATH,
                disabled: this.apiImpl.loginGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGOUT_PATH),
                id: LOGOUT_PATH,
                disabled: this.apiImpl.logoutPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGOUT_PATH),
                id: LOGOUT_PATH,
                disabled: this.apiImpl.logoutGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CONSENT_PATH),
                id: CONSENT_PATH,
                disabled: this.apiImpl.consentPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(CONSENT_PATH),
                id: CONSENT_PATH,
                disabled: this.apiImpl.consentGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(TOKEN_PATH),
                id: TOKEN_PATH,
                disabled: this.apiImpl.tokenPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(AUTH_PATH),
                id: AUTH_PATH,
                disabled: this.apiImpl.authGET === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_INFO_PATH),
                id: LOGIN_INFO_PATH,
                disabled: this.apiImpl.loginInfoGET === undefined,
            },
        ];
    }

    handleAPIRequest = async (
        id: string,
        _tenantId: string | undefined,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };

        if (id === LOGIN_PATH) {
            return loginAPI(this.apiImpl, options, userContext);
        }
        if (id === LOGOUT_PATH) {
            return logoutAPI(this.apiImpl, options, userContext);
        }
        if (id === CONSENT_PATH) {
            return consentAPI(this.apiImpl, options, userContext);
        }
        if (id === TOKEN_PATH) {
            return tokenPOST(this.apiImpl, options, userContext);
        }
        if (id === AUTH_PATH) {
            return authGET(this.apiImpl, options, userContext);
        }
        if (id === LOGIN_INFO_PATH) {
            return loginInfoGET(this.apiImpl, options, userContext);
        }
        throw new Error("Should never come here: handleAPIRequest called with unknown id");
    };

    handleError(error: error, _: BaseRequest, __: BaseResponse, _userContext: UserContext): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
