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
import type { BaseRequest, BaseResponse } from "../../framework";
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
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypePasswordlessEmailDeliveryInput, TypePasswordlessSmsDeliveryInput } from "./types";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import MultiFactorAuthRecipe from "../multifactorauth/recipe";
import { User } from "../../user";
import { isFactorSetupForUser } from "./utils";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "passwordless";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput>;

    smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput>;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput> | undefined;
            smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput> | undefined;
        }
    ) {
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

        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new EmailDeliveryIngredient(this.config.getEmailDeliveryConfig())
                : ingredients.emailDelivery;

        this.smsDelivery =
            ingredients.smsDelivery === undefined
                ? new SmsDeliveryIngredient(this.config.getSmsDeliveryConfig())
                : ingredients.smsDelivery;
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
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                    smsDelivery: undefined,
                });

                let otpOrLink: string[] = [];
                let emailOrPhone: string[] = [];

                if (Recipe.instance.config.flowType === "MAGIC_LINK") {
                    otpOrLink.push("link");
                } else if (Recipe.instance.config.flowType === "USER_INPUT_CODE") {
                    otpOrLink.push("otp");
                } else {
                    otpOrLink.push("otp");
                    otpOrLink.push("link");
                }

                if (Recipe.instance.config.contactMethod === "EMAIL") {
                    emailOrPhone.push("email");
                } else if (Recipe.instance.config.contactMethod === "PHONE") {
                    emailOrPhone.push("phone");
                } else {
                    emailOrPhone.push("email");
                    emailOrPhone.push("phone");
                }

                const allFactors: string[] = [];
                for (const ol of otpOrLink) {
                    for (const ep of emailOrPhone) {
                        allFactors.push(`${ol}-${ep}`);
                    }
                }

                PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    const mfaInstance = MultiFactorAuthRecipe.getInstance();

                    if (mfaInstance !== undefined) {
                        mfaInstance.addAvailableFactorIdsFromOtherRecipes(allFactors, allFactors);
                        mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(async (user: User) => {
                            return allFactors.filter((id) => isFactorSetupForUser(user, id));
                        });
                    }
                });

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
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: Record<string, any>
    ): Promise<boolean> => {
        const options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
            emailDelivery: this.emailDelivery,
            smsDelivery: this.smsDelivery,
            appInfo: this.getAppInfo(),
        };
        if (id === CONSUME_CODE_API) {
            return await consumeCodeAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === CREATE_CODE_API) {
            return await createCodeAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === DOES_EMAIL_EXIST_API) {
            return await emailExistsAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === DOES_PHONE_NUMBER_EXIST_API) {
            return await phoneNumberExistsAPI(this.apiImpl, tenantId, options, userContext);
        } else {
            return await resendCodeAPI(this.apiImpl, tenantId, options, userContext);
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
                  tenantId: string;
                  request: BaseRequest | undefined;
                  userContext: Record<string, any>;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  request: BaseRequest | undefined;
                  userContext: Record<string, any>;
              }
    ): Promise<string> => {
        let userInputCode =
            this.config.getCustomUserInputCode !== undefined
                ? await this.config.getCustomUserInputCode(input.tenantId, input.userContext)
                : undefined;

        const codeInfo = await this.recipeInterfaceImpl.createCode(
            "email" in input
                ? {
                      email: input.email,
                      userInputCode,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      userInputCode,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
        );

        const appInfo = this.getAppInfo();

        let magicLink =
            appInfo
                .getOrigin({
                    request: input.request,
                    userContext: input.userContext,
                })
                .getAsStringDangerous() +
            appInfo.websiteBasePath.getAsStringDangerous() +
            "/verify" +
            "?rid=" +
            this.getRecipeId() +
            "&preAuthSessionId=" +
            codeInfo.preAuthSessionId +
            "&tenantId=" +
            input.tenantId +
            "#" +
            codeInfo.linkCode;

        return magicLink;
    };

    signInUp = async (
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext: Record<string, any>;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext: Record<string, any>;
              }
    ) => {
        let codeInfo = await this.recipeInterfaceImpl.createCode(
            "email" in input
                ? {
                      email: input.email,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
        );

        let consumeCodeResponse = await this.recipeInterfaceImpl.consumeCode(
            this.config.flowType === "MAGIC_LINK"
                ? {
                      preAuthSessionId: codeInfo.preAuthSessionId,
                      linkCode: codeInfo.linkCode,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
                : {
                      preAuthSessionId: codeInfo.preAuthSessionId,
                      deviceId: codeInfo.deviceId,
                      userInputCode: codeInfo.userInputCode,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
        );

        if (consumeCodeResponse.status === "OK") {
            return {
                status: "OK",
                createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                recipeUserId: consumeCodeResponse.recipeUserId,
                user: consumeCodeResponse.user,
                isValidFirstFactorForTenant: consumeCodeResponse.isValidFirstFactorForTenant,
            };
        } else {
            throw new Error("Failed to create user. Please retry");
        }
    };
}
