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
import { TypeInput, TypeNormalisedInput, TypeProvider, RecipeInterface, User, APIInterface } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import EmailVerificationRecipe from "../emailverification/recipe";
import * as express from "express";
import STError from "./error";

import { SIGN_IN_UP_API, AUTHORISATION_API } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import signInUpAPI from "./api/signinup";
import authorisationUrlAPI from "./api/authorisationUrl";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdparty";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    providers: TypeProvider[];

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            emailVerificationInstance: EmailVerificationRecipe | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.emailVerificationRecipe =
            recipes.emailVerificationInstance !== undefined
                ? recipes.emailVerificationInstance
                : new EmailVerificationRecipe(recipeId, appInfo, isInServerlessEnv, {
                      ...this.config.emailVerificationFeature,
                  });

        this.providers = this.config.signInAndUpFeature.providers;
        this.recipeInterfaceImpl = this.config.override.functions(
            new RecipeImplementation(Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipeId))
        );
        this.apiImpl = this.config.override.apis(new APIImplementation());
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailVerificationInstance: undefined,
                });
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
            ...this.emailVerificationRecipe.getAPIsHandled(),
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => {
        let options = {
            config: this.config,
            next,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            providers: this.providers,
            req,
            res,
        };
        if (id === SIGN_IN_UP_API) {
            return await signInUpAPI(this.apiImpl, options);
        } else if (id === AUTHORISATION_API) {
            return await authorisationUrlAPI(this.apiImpl, options);
        } else {
            return await this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
        }
    };

    handleError = (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            return next(err);
        } else {
            return this.emailVerificationRecipe.handleError(err, request, response, next);
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [...this.emailVerificationRecipe.getAllCORSHeaders()];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (err.fromRecipe === Recipe.RECIPE_ID || this.emailVerificationRecipe.isErrorFromThisRecipe(err))
        );
    };

    // helper functions...

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.recipeInterfaceImpl.getUserById({ userId });
        if (userInfo === undefined) {
            throw Error("Unknown User ID provided");
        }
        return userInfo.email;
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return this.emailVerificationRecipe.createEmailVerificationToken(userId, await this.getEmailForUserId(userId));
    };

    verifyEmailUsingToken = async (token: string): Promise<User> => {
        let user = await this.emailVerificationRecipe.verifyEmailUsingToken(token);
        let userInThisRecipe = await this.recipeInterfaceImpl.getUserById({ userId: user.id });
        if (userInThisRecipe === undefined) {
            throw Error("Unknown User ID provided");
        }
        return userInThisRecipe;
    };

    isEmailVerified = async (userId: string) => {
        return this.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
            userId,
            email: await this.getEmailForUserId(userId),
        });
    };
}
