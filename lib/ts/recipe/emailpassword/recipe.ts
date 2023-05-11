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
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, HTTPMethod, RecipeListFunction } from "../../types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import {
    SIGN_UP_API,
    SIGN_IN_API,
    GENERATE_PASSWORD_RESET_TOKEN_API,
    PASSWORD_RESET_API,
    SIGNUP_EMAIL_EXISTS_API,
    LINK_ACCOUNT_TO_EXISTING_ACCOUNT_API,
} from "./constants";
import signUpAPI from "./api/signup";
import signInAPI from "./api/signin";
import generatePasswordResetTokenAPI from "./api/generatePasswordResetToken";
import passwordResetAPI from "./api/passwordReset";
import { send200Response } from "../../utils";
import emailExistsAPI from "./api/emailExists";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypeEmailPasswordEmailDeliveryInput } from "./types";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "emailpassword";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput> | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        {
            const getEmailPasswordConfig = () => this.config;
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), getEmailPasswordConfig)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new EmailDeliveryIngredient(
                      this.config.getEmailDeliveryConfig(this.recipeInterfaceImpl, this.isInServerlessEnv)
                  )
                : ingredients.emailDelivery;
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                });
                return Recipe.instance;
            } else {
                throw new Error("Emailpassword recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGN_UP_API),
                id: SIGN_UP_API,
                disabled: this.apiImpl.signUpPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGN_IN_API),
                id: SIGN_IN_API,
                disabled: this.apiImpl.signInPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(GENERATE_PASSWORD_RESET_TOKEN_API),
                id: GENERATE_PASSWORD_RESET_TOKEN_API,
                disabled: this.apiImpl.generatePasswordResetTokenPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(PASSWORD_RESET_API),
                id: PASSWORD_RESET_API,
                disabled: this.apiImpl.passwordResetPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGNUP_EMAIL_EXISTS_API),
                id: SIGNUP_EMAIL_EXISTS_API,
                disabled: this.apiImpl.emailExistsGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(LINK_ACCOUNT_TO_EXISTING_ACCOUNT_API),
                id: LINK_ACCOUNT_TO_EXISTING_ACCOUNT_API,
                disabled: this.apiImpl.linkAccountToExistingAccountPOST === undefined,
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
            req,
            res,
            emailDelivery: this.emailDelivery,
            appInfo: this.getAppInfo(),
        };
        if (id === SIGN_UP_API) {
            return await signUpAPI(this.apiImpl, options);
        } else if (id === SIGN_IN_API) {
            return await signInAPI(this.apiImpl, options);
        } else if (id === GENERATE_PASSWORD_RESET_TOKEN_API) {
            return await generatePasswordResetTokenAPI(this.apiImpl, options);
        } else if (id === PASSWORD_RESET_API) {
            return await passwordResetAPI(this.apiImpl, options);
        } else if (id === SIGNUP_EMAIL_EXISTS_API) {
            return await emailExistsAPI(this.apiImpl, options);
        }
        return false;
    };

    handleError = async (err: STError, _request: BaseRequest, response: BaseResponse): Promise<void> => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            if (err.type === STError.FIELD_ERROR) {
                return send200Response(response, {
                    status: "FIELD_ERROR",
                    formFields: err.payload,
                });
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
