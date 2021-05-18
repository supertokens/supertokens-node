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
import { TypeInput, TypeNormalisedInput, TypeProvider, RecipeInterface, User } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import EmailVerificationRecipe from "../emailverification/recipe";
import * as express from "express";
import STError from "./error";

import { SIGN_IN_UP_API, SIGN_OUT_API, AUTHORISATION_API } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import signOutAPI from "./api/signout";
import signInUpAPI from "./api/signinup";
import authorisationUrlAPI from "./api/authorisationUrl";
import { send200Response } from "../../utils";
import RecipeImplementation from "./recipeImplementation";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdparty";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    providers: TypeProvider[];

    recipeInterfaceImpl: RecipeInterface;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        rIdToCore?: string
    ) {
        super(recipeId, appInfo, isInServerlessEnv, rIdToCore);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.emailVerificationRecipe = new EmailVerificationRecipe(
            recipeId,
            appInfo,
            isInServerlessEnv,
            this.config.emailVerificationFeature
        );

        this.providers = this.config.signInAndUpFeature.providers;
        this.recipeInterfaceImpl = new RecipeImplementation(this);
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "ThirdParty recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    undefined
                );
            }
        };
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            undefined
        );
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                undefined
            );
        }
        Recipe.instance = undefined;
    }

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this, SIGN_IN_UP_API),
                id: SIGN_IN_UP_API,
                disabled: this.config.signInAndUpFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this, SIGN_OUT_API),
                id: SIGN_OUT_API,
                disabled: this.config.signOutFeature.disableDefaultImplementation,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(this, AUTHORISATION_API),
                id: AUTHORISATION_API,
                disabled: this.config.signInAndUpFeature.disableDefaultImplementation,
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
        if (id === SIGN_IN_UP_API) {
            return await signInUpAPI(this, req, res, next);
        } else if (id === SIGN_OUT_API) {
            return await signOutAPI(this, req, res, next);
        } else if (id === AUTHORISATION_API) {
            return await authorisationUrlAPI(this, req, res, next);
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
        if (err.type === STError.NO_EMAIL_GIVEN_BY_PROVIDER) {
            return send200Response(response, {
                status: "NO_EMAIL_GIVEN_BY_PROVIDER",
            });
        } else if (err.type === STError.FIELD_ERROR) {
            return send200Response(response, {
                status: "FIELD_ERROR",
                error: err.message,
            });
        }
        return this.emailVerificationRecipe.handleError(err, request, response, next);
    };

    getAllCORSHeaders = (): string[] => {
        return [...this.emailVerificationRecipe.getAllCORSHeaders()];
    };

    isErrorFromThisOrChildRecipeBasedOnInstance = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (this === err.recipe || this.emailVerificationRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err))
        );
    };

    // helper functions...

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.recipeInterfaceImpl.getUserById(userId);
        if (userInfo === undefined) {
            throw new STError(
                {
                    type: STError.UNKNOWN_USER_ID_ERROR,
                    message: "Unknown User ID provided",
                },
                this
            );
        }
        return userInfo.email;
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return this.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken(
            userId,
            await this.getEmailForUserId(userId)
        );
    };

    verifyEmailUsingToken = async (token: string): Promise<User> => {
        let user = await this.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken(token);
        let userInThisRecipe = await this.recipeInterfaceImpl.getUserById(user.id);
        if (userInThisRecipe === undefined) {
            throw new STError(
                {
                    type: STError.UNKNOWN_USER_ID_ERROR,
                    message: "Unknown User ID provided",
                },
                this
            );
        }
        return userInThisRecipe;
    };

    isEmailVerified = async (userId: string) => {
        return this.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified(
            userId,
            await this.getEmailForUserId(userId)
        );
    };
}
