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
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import consumeCodeAPI from "./api/consumeCode";
import createCodeAPI from "./api/createCode";
import emailExistsAPI from "./api/emailExists";
import phoneNumberExistsAPI from "./api/phoneNumberExists";
import resendCodeAPI from "./api/resendCode";
import {
    CONSUME_CODE_API,
    CREATE_CODE_API,
    DOES_EMAIL_EXIST_API,
    DOES_PHONE_NUMBER_EXIST_API,
    RESEND_CODE_API,
} from "./constants";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "passwordless";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("Passwordless recipe has already been initialised. Please check your code for bugs.");
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
                id: CONSUME_CODE_API,
                disabled: this.apiImpl.consumeCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CONSUME_CODE_API),
            },
            {
                id: CREATE_CODE_API,
                disabled: this.apiImpl.createCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CREATE_CODE_API),
            },
            {
                id: DOES_EMAIL_EXIST_API,
                disabled: this.apiImpl.emailExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_EMAIL_EXIST_API),
            },
            {
                id: DOES_PHONE_NUMBER_EXIST_API,
                disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_PHONE_NUMBER_EXIST_API),
            },
            {
                id: RESEND_CODE_API,
                disabled: this.apiImpl.resendCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(RESEND_CODE_API),
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
        };
        if (id === CONSUME_CODE_API) {
            return await consumeCodeAPI(this.apiImpl, options);
        } else if (id === CREATE_CODE_API) {
            return await createCodeAPI(this.apiImpl, options);
        } else if (id === DOES_EMAIL_EXIST_API) {
            return await emailExistsAPI(this.apiImpl, options);
        } else if (id === DOES_PHONE_NUMBER_EXIST_API) {
            return await phoneNumberExistsAPI(this.apiImpl, options);
        } else {
            return await resendCodeAPI(this.apiImpl, options);
        }
    };

    handleError = async (err: STError, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };

    // helper functions below...

    createMagicLink = async (
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ): Promise<string> => {
        let userInputCode =
            this.config.getCustomUserInputCode !== undefined
                ? await this.config.getCustomUserInputCode(input.userContext)
                : undefined;

        const codeInfo = await this.recipeInterfaceImpl.createCode(
            "email" in input
                ? {
                      email: input.email,
                      userInputCode,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      userInputCode,
                      userContext: input.userContext,
                  }
        );

        let magicLink =
            (await this.config.getLinkDomainAndPath(
                "phoneNumber" in input
                    ? {
                          phoneNumber: input.phoneNumber!,
                      }
                    : {
                          email: input.email,
                      },
                input.userContext
            )) +
            "?rid=" +
            this.getRecipeId() +
            "&preAuthSessionId=" +
            codeInfo.preAuthSessionId +
            "#" +
            codeInfo.linkCode;

        return magicLink;
    };

    signInUp = async (
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) => {
        let codeInfo = await this.recipeInterfaceImpl.createCode(
            "email" in input
                ? {
                      email: input.email,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      userContext: input.userContext,
                  }
        );

        let consumeCodeResponse = await this.recipeInterfaceImpl.consumeCode(
            this.config.flowType === "MAGIC_LINK"
                ? {
                      preAuthSessionId: codeInfo.preAuthSessionId,
                      linkCode: codeInfo.linkCode,
                      userContext: input.userContext,
                  }
                : {
                      preAuthSessionId: codeInfo.preAuthSessionId,
                      deviceId: codeInfo.deviceId,
                      userInputCode: codeInfo.userInputCode,
                      userContext: input.userContext,
                  }
        );

        if (consumeCodeResponse.status === "OK") {
            return {
                status: "OK",
                createdNewUser: consumeCodeResponse.createdNewUser,
                user: consumeCodeResponse.user,
            };
        } else {
            throw new Error("Failed to create user. Please retry");
        }
    };
}
