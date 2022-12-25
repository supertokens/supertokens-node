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

import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import SuperTokens from "../..";
import SuperTokensModule from "../../supertokens";
import type {
    AccountInfoWithRecipeId,
    APIHandled,
    HTTPMethod,
    NormalisedAppinfo,
    RecipeListFunction,
} from "../../types";
import { SessionContainer } from "../session";
import type { AccountInfoAndEmailWithRecipeId, TypeNormalisedInput, RecipeInterface, TypeInput } from "./types";
import { User } from "../../types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import SuperTokensError from "../../error";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;

    static RECIPE_ID = "accountlinking";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

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

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
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
                throw new Error("AccountLinking recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance === undefined) {
            Recipe.init({})(
                SuperTokensModule.getInstanceOrThrowError().appInfo,
                SuperTokensModule.getInstanceOrThrowError().isInServerlessEnv
            );
        }
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    getAPIsHandled(): APIHandled[] {
        return [];
    }

    handleAPIRequest(
        _id: string,
        _req: BaseRequest,
        _response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean> {
        throw new Error("Should never come here");
    }

    handleError(error: error, _request: BaseRequest, _response: BaseResponse): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }

    isSignUpAllowed = async (input: { info: AccountInfoWithRecipeId }): Promise<boolean> => {
        let user: User | undefined = await SuperTokens.getUserByAccountInfo(input);
        if (user === undefined || !user.isPrimaryUser) {
            return true;
        }
        let shouldRequireVerification = false; // TOOD: call shouldRequireVerification from config
        if (!shouldRequireVerification) {
            return true;
        }
        // /**
        //  * for each linked recipes, get all the verified identifying info
        //  *
        //  * if the input identifyingInfo is found in the above generated list
        //  * of verified identifyingInfos, return true else false.
        //  */
        return true;
    };
    createPrimaryUserIdOrLinkAccountPostSignUp = async (_input: {
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
        shouldRequireVerification: boolean;
    }) => {
        // TODO
    };
    accountLinkPostSignInViaSession = async (_input: {
        session: SessionContainer;
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
    }): Promise<
        | {
              createRecipeUser: true;
          }
        | ({
              createRecipeUser: false;
          } & (
              | {
                    accountsLinked: true;
                }
              | {
                    accountsLinked: false;
                    reason: string; // TODO
                }
          ))
    > => {
        // let userId = session.getUserId();
        return {
            createRecipeUser: true,
        };
    };
}
