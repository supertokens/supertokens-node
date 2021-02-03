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
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import * as express from "express";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import { GENERATE_EMAIL_VERIFY_TOKEN_API, EMAIL_VERIFY_API } from "./constants";
import {
    createEmailVerificationToken as createEmailVerificationTokenFromCore,
    verifyEmailUsingToken as verifyEmailUsingTokenFromCore,
    isEmailVerified as isEmailVerifiedFromCore,
} from "./coreAPICalls";
import { send200Response } from "../../utils";
import generateEmailVerifyTokenAPI from "./api/generateEmailVerifyToken";
import emailVerifyAPI from "./api/emailVerify";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "emailverification";

    config: TypeNormalisedInput;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput) {
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

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Emailverification recipe has already been initialised. Please check your code for bugs."
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
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), GENERATE_EMAIL_VERIFY_TOKEN_API),
                id: GENERATE_EMAIL_VERIFY_TOKEN_API,
                disabled: this.config.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.config.disableDefaultImplementation,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.config.disableDefaultImplementation,
            },
        ];
    };

    handleAPIRequest = async (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (id === GENERATE_EMAIL_VERIFY_TOKEN_API) {
            return await generateEmailVerifyTokenAPI(this, req, res, next);
        } else {
            return await emailVerifyAPI(this, req, res, next);
        }
    };

    handleError = (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (err.type === STError.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR) {
            return send200Response(response, {
                status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
            });
        } else if (err.type === STError.EMAIL_ALREADY_VERIFIED_ERROR) {
            return send200Response(response, {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            });
        } else {
            return next(err);
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    // instance functions below...............

    createEmailVerificationToken = async (userId: string, email: string): Promise<string> => {
        return createEmailVerificationTokenFromCore(this, userId, email);
    };

    verifyEmailUsingToken = async (token: string) => {
        return verifyEmailUsingTokenFromCore(this, token);
    };

    isEmailVerified = async (userId: string, email: string) => {
        return isEmailVerifiedFromCore(this, userId, email);
    };
}
