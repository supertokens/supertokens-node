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
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import EmailVerificationRecipe from "../emailverification/recipe";
import * as express from "express";
import STError from "./error";
import {
    getUsers as getUsersCore,
    getUsersCount as getUsersCountCore,
    getUserById as getUserByIdFromCore,
    getUserByThirdPartyInfo as getUserByThirdPartyInfoFromCore,
} from "./coreAPICalls";
import ThirdPartyProvider from "./providers";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdparty";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    providers: ThirdPartyProvider[];

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.emailVerificationRecipe = new EmailVerificationRecipe(
            recipeId,
            appInfo,
            this.config.emailVerificationFeature
        );

        this.providers = this.config.signInAndUpFeature.providers.map((func) => {
            return func(this);
        });
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

    getAPIsHandled = (): APIHandled[] => {
        let apisHandled: APIHandled[] = [];
        for (let i = 0; i < this.providers.length; i++) {
            apisHandled.push(...this.providers[i].getAPIsHandled());
        }
        return apisHandled;
    };

    handleAPIRequest = async (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        for (let i = 0; i < this.providers.length; i++) {
            let apisHandled = this.providers[i].getAPIsHandled();
            for (let j = 0; j < apisHandled.length; j++) {
                if (id === apisHandled[j].id) {
                    return await this.providers[i].handleAPIRequest(id, req, res, next);
                }
            }
        }
    };

    handleError = (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        return next(err);
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        return getUserByIdFromCore(this, userId);
    };

    getUserByThirdPartyInfo = async (thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> => {
        return getUserByThirdPartyInfoFromCore(this, thirdPartyId, thirdPartyUserId);
    };

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.getUserById(userId);
        if (userInfo === undefined) {
            throw new STError(
                {
                    type: STError.UNKNOWN_USER_ID_ERROR,
                    message: "Unknown User ID provided",
                },
                this.getRecipeId()
            );
        }
        return userInfo.thirdParty.email;
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return this.emailVerificationRecipe.createEmailVerificationToken(userId, await this.getEmailForUserId(userId));
    };

    verifyEmailUsingToken = async (token: string) => {
        return this.emailVerificationRecipe.verifyEmailUsingToken(token);
    };

    isEmailVerified = async (userId: string) => {
        return this.emailVerificationRecipe.isEmailVerified(userId, await this.getEmailForUserId(userId));
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this, "ASC", limit, nextPaginationToken);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this, "DESC", limit, nextPaginationToken);
    };

    getUserCount = async () => {
        return getUsersCountCore(this);
    };
}
