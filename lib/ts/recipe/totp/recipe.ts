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
import { CREATE_DEVICE_API, VERIFY_CODE_API, VERIFY_DEVICE_API, LIST_DEVICE_API, REMOVE_DEVICE_API } from "./constants";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    GetUserIdentifierInfoForUserIdFunc,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import STError from "./error";
import { Querier } from "../../querier";
import { BaseRequest, BaseResponse } from "../../framework";
import createDeviceAPI from "./api/createDevice";
import verifyDeviceAPI from "./api/verifyDevice";
import verifyCodeAPI from "./api/verifyCode";
import removeDeviceAPI from "./api/removeDevice";
import listDevicesAPI from "./api/listDevices";
import { sendNon200ResponseWithMessage } from "../../utils";
import TotpError from "./error";
import { getUser } from "../..";

export default class TotpRecipe extends RecipeModule {
    private static instance: TotpRecipe | undefined = undefined;
    static RECIPE_ID = "totp";

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

    static getInstanceOrThrowError(): TotpRecipe {
        if (TotpRecipe.instance !== undefined) {
            return TotpRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init or totp.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (TotpRecipe.instance === undefined) {
                TotpRecipe.instance = new TotpRecipe(TotpRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config ?? {});
                return TotpRecipe.instance;
            } else {
                throw new Error("TOTP recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        TotpRecipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                id: CREATE_DEVICE_API,
                disabled: this.apiImpl.createDevicePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CREATE_DEVICE_API),
            },
            {
                id: VERIFY_DEVICE_API,
                disabled: this.apiImpl.verifyDevicePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(VERIFY_DEVICE_API),
            },
            {
                id: VERIFY_CODE_API,
                disabled: this.apiImpl.verifyCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(VERIFY_CODE_API),
            },
            {
                id: REMOVE_DEVICE_API,
                disabled: this.apiImpl.removeDevicePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(REMOVE_DEVICE_API),
            },
            {
                id: LIST_DEVICE_API,
                disabled: this.apiImpl.listDevicesGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LIST_DEVICE_API),
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
        if (id === CREATE_DEVICE_API) {
            return await createDeviceAPI(this.apiImpl, options);
        } else if (id == VERIFY_DEVICE_API) {
            return await verifyDeviceAPI(this.apiImpl, options);
        } else if (id == VERIFY_CODE_API) {
            return await verifyCodeAPI(this.apiImpl, options);
        } else if (id == REMOVE_DEVICE_API) {
            return await removeDeviceAPI(this.apiImpl, options);
        } else if (id == LIST_DEVICE_API) {
            return await listDevicesAPI(this.apiImpl, options);
        }

        return false;
    };

    handleError = async (err: STError, _: BaseRequest, res: BaseResponse): Promise<void> => {
        if (err.fromRecipe === TotpRecipe.RECIPE_ID) {
            if (err.type === TotpError.TOTP_NOT_ENABLED_ERROR) {
                sendNon200ResponseWithMessage(res, "TOTP is not enabled for the user", 403); // bad req
            }
        }
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === TotpRecipe.RECIPE_ID;
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

        if (primaryLoginMethod === undefined) {
            return {
                status: "UNKNOWN_USER_ID_ERROR",
            };
        }

        if (primaryLoginMethod.email !== undefined) {
            return {
                info: primaryLoginMethod.email,
                status: "OK",
            };
        } else if (user.emails.length > 0) {
            // fallback on trying the first email
            return { info: user.emails[0], status: "OK" };
        } else if (primaryLoginMethod.phoneNumber !== undefined) {
            return {
                info: primaryLoginMethod.phoneNumber,
                status: "OK",
            };
        } else if (user.phoneNumbers.length > 0) {
            return { info: user.phoneNumbers[0], status: "OK" };
        }

        return {
            status: "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR",
        };
    };
}
