/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import * as express from "express";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import { SIGN_UP_API, SIGN_IN_API } from "./constants";
import {
    signUp as signUpAPIToCore,
    signIn as signInAPIToCore,
    getUserById as getUserByIdFromCore,
    getUserByEmail as getUserByEmailFromCore,
} from "./coreAPICalls";
import signUpAPI from "./api/signup";
import signInAPI from "./api/signin";
import { send200Response } from "../../utils";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "email-password";

    config: TypeNormalisedInput;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
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
            Recipe.RECIPE_ID
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Emailpassword recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    Recipe.RECIPE_ID
                );
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                Recipe.RECIPE_ID
            );
        }
        Recipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGN_UP_API),
                id: "SIGN_UP",
                disabled: this.config.signUpFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGN_IN_API),
                id: "SIGN_IN",
                disabled: this.config.signInFeature.disableDefaultImplementation,
            },
        ];
    };

    handleAPIRequest = async (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (id === "SIGN_UP") {
            return await signUpAPI(this, req, res, next);
        } else if (id === "SIGN_IN") {
            return await signInAPI(this, req, res, next);
        }
    };

    handleError = (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (err.type === STError.EMAIL_ALREADY_EXISTS_ERROR) {
            // As per point number 3a in https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536
            return this.handleError(
                new STError(
                    {
                        type: STError.FIELD_ERROR,
                        payload: [
                            {
                                id: "email",
                                error: "This email already exists. Please sign in instead.",
                            },
                        ],
                        message: "Error in input formFields",
                    },
                    this.getRecipeId()
                ),
                request,
                response,
                next
            );
        } else if (err.type === STError.WRONG_CREDENTIAL_ERROR) {
            return send200Response(response, {
                status: "WRONG_CREDENTIAL_ERROR",
            });
        } else {
            return send200Response(response, {
                status: "FIELD_ERROR",
                formFields: err.payload,
            });
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    // instance functions below...............

    signUp = async (email: string, password: string): Promise<User> => {
        return signUpAPIToCore(this, email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return signInAPIToCore(this, email, password);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        return getUserByIdFromCore(this, userId);
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return getUserByEmailFromCore(this, email);
    };
}
