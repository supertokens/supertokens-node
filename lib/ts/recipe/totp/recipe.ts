/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import {
    CREATE_TOTP_DEVICE,
    VERIFY_TOTP_DEVICE,
    VERIFY_TOTP,
    LIST_TOTP_DEVICES,
    REMOVE_TOTP_DEVICE,
} from "./constants";
import {
    APIInterface,
    GetUserIdentifierInfoForUserIdFunc,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";

import createDeviceAPI from "./api/createDevice";
import verifyDeviceAPI from "./api/verifyDevice";
import verifyTOTPAPI from "./api/verifyTOTP";
import listDevicesAPI from "./api/listDevices";
import removeDeviceAPI from "./api/removeDevice";
import { User, getUser } from "../..";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import MultiFactorAuthRecipe from "../multifactorauth/recipe";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "totp";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

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

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);

                PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    const mfaInstance = MultiFactorAuthRecipe.getInstance();
                    if (mfaInstance !== undefined) {
                        mfaInstance.addGetAllFactorsFromOtherRecipesFunc(() => {
                            return ["totp"];
                        });
                        mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(
                            async (_: string, user: User, userContext: UserContext) => {
                                const deviceRes = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listDevices(
                                    {
                                        userId: user.id,
                                        userContext,
                                    }
                                );
                                for (const device of deviceRes.devices) {
                                    if (device.verified) {
                                        return ["totp"];
                                    }
                                }
                                return [];
                            }
                        );
                    }
                });

                return Recipe.instance;
            } else {
                throw new Error("TOTP recipe has already been initialised. Please check your code for bugs.");
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
                pathWithoutApiBasePath: new NormalisedURLPath(CREATE_TOTP_DEVICE),
                id: CREATE_TOTP_DEVICE,
                disabled: this.apiImpl.createDevicePOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LIST_TOTP_DEVICES),
                id: LIST_TOTP_DEVICES,
                disabled: this.apiImpl.listDevicesGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(REMOVE_TOTP_DEVICE),
                id: REMOVE_TOTP_DEVICE,
                disabled: this.apiImpl.removeDevicePOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(VERIFY_TOTP_DEVICE),
                id: VERIFY_TOTP_DEVICE,
                disabled: this.apiImpl.verifyDevicePOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(VERIFY_TOTP),
                id: VERIFY_TOTP,
                disabled: this.apiImpl.verifyTOTPPOST === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options = {
            recipeImplementation: this.recipeInterfaceImpl,
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            req,
            res,
        };
        if (id === CREATE_TOTP_DEVICE) {
            return await createDeviceAPI(this.apiImpl, options, userContext);
        } else if (id === LIST_TOTP_DEVICES) {
            return await listDevicesAPI(this.apiImpl, options, userContext);
        } else if (id === REMOVE_TOTP_DEVICE) {
            return await removeDeviceAPI(this.apiImpl, options, userContext);
        } else if (id === VERIFY_TOTP_DEVICE) {
            return await verifyDeviceAPI(this.apiImpl, options, userContext);
        } else if (id === VERIFY_TOTP) {
            return await verifyTOTPAPI(this.apiImpl, options, userContext);
        }
        throw new Error("should never come here");
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

    getUserIdentifierInfoForUserId: GetUserIdentifierInfoForUserIdFunc = async (userId, userContext) => {
        if (this.config.getUserIdentifierInfoForUserId !== undefined) {
            const userRes = await this.config.getUserIdentifierInfoForUserId(userId, userContext);
            if (userRes.status !== "UNKNOWN_USER_ID_ERROR") {
                return userRes;
            }
        }

        let user = await getUser(userId, userContext);

        if (user === undefined) {
            return {
                status: "UNKNOWN_USER_ID_ERROR",
            };
        }

        const primaryLoginMethod = user.loginMethods.find((method) => method.recipeUserId.getAsString() === user!.id);

        if (primaryLoginMethod !== undefined) {
            if (primaryLoginMethod.email !== undefined) {
                return {
                    info: primaryLoginMethod.email,
                    status: "OK",
                };
            } else if (primaryLoginMethod.phoneNumber !== undefined) {
                return {
                    info: primaryLoginMethod.phoneNumber,
                    status: "OK",
                };
            }
        }

        if (user.emails.length > 0) {
            return { info: user.emails[0], status: "OK" };
        } else if (user.phoneNumbers.length > 0) {
            return { info: user.phoneNumbers[0], status: "OK" };
        }

        return {
            status: "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR",
        };
    };
}
