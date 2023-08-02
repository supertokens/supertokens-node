/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import normalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";

import RecipeImplementation from "./recipeImplementation";
import { RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import SessionRecipe from "../session/recipe";
import { UserRoleClaim } from "./userRoleClaim";
import { PermissionClaim } from "./permissionClaim";

export default class Recipe extends RecipeModule {
    static RECIPE_ID = "userroles";
    private static instance: Recipe | undefined = undefined;

    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            if (!this.config.skipAddingRolesToAccessToken) {
                SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(UserRoleClaim);
            }
            if (!this.config.skipAddingPermissionsToAccessToken) {
                SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(PermissionClaim);
            }
        });
    }

    /* Init functions */

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error(
            "Initialisation not done. Did you forget to call the UserRoles.init or SuperTokens.init functions?"
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("UserRoles recipe has already been initialised. Please check your code for bugs.");
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
        return [];
    }

    // This stub is required to implement RecipeModule
    handleAPIRequest = async (
        _: string,
        ______: string | undefined, // TODO tenantId
        __: BaseRequest,
        ___: BaseResponse,
        ____: normalisedURLPath,
        _____: HTTPMethod
    ): Promise<boolean> => {
        throw new Error("Should never come here");
    };

    handleError(error: error, _: BaseRequest, __: BaseResponse): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
}
