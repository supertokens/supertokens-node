/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import OverrideableBuilder from "supertokens-js-override";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { FACTOR_IS_SETUP_API, LIST_FACTORS_API } from "./constants";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import STError from "./error";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import factorIsSetupAPI from "./api/factorIsSetup";
import listFactorsAPi from "./api/listFactors";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import { MfaClaim } from "./mfaClaim";
import SessionRecipe from "../session/recipe";

export default class MfaRecipe extends RecipeModule {
    private static instance: MfaRecipe | undefined = undefined;
    static RECIPE_ID = "mfa";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    static getInstanceOrThrowError(): MfaRecipe {
        if (MfaRecipe.instance !== undefined) {
            return MfaRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init or totp.init function?");
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (MfaRecipe.instance === undefined) {
                MfaRecipe.instance = new MfaRecipe(MfaRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);

                PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(MfaClaim);

                    SessionRecipe.getInstanceOrThrowError().addClaimValidatorFromOtherRecipe(
                        MfaClaim.validators.hasCompletedFactors()
                    );
                });

                return MfaRecipe.instance;
            } else {
                throw new Error("MFA recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        MfaRecipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                id: FACTOR_IS_SETUP_API,
                disabled: this.apiImpl.isFactorAlreadySetupForUserGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(FACTOR_IS_SETUP_API),
            },
            {
                id: LIST_FACTORS_API,
                disabled: this.apiImpl.listFactorsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LIST_FACTORS_API),
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod
    ): Promise<boolean> => {
        const options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
            appInfo: this.getAppInfo(),
        };
        if (id === FACTOR_IS_SETUP_API) {
            return await factorIsSetupAPI(this.apiImpl, options);
        } else if (id === LIST_FACTORS_API) {
            return await listFactorsAPi(this.apiImpl, options);
        }

        return false;
    };

    handleError = async (err: STError, _: BaseRequest, _res: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === MfaRecipe.RECIPE_ID;
    };
}
