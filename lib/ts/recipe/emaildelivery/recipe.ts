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

import STError from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo } from "../../types";
import { ConfigInput, EmailService, RecipeInterface } from "./types";

export default class Recipe<TypeInput> extends RecipeModule {
    static RECIPE_ID = "emaildelivery";

    service: EmailService<TypeInput> | undefined;
    recipeInterfaceImpl: RecipeInterface<TypeInput>;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: ConfigInput<TypeInput>) {
        super(recipeId, appInfo);
        this.recipeInterfaceImpl = config.recipeImpl;
        this.service = config.service;
    }

    getAPIsHandled = (): APIHandled[] => {
        return [];
    };
    handleAPIRequest = async (
        _: string,
        __: BaseRequest,
        ___: BaseResponse,
        ____: normalisedURLPath,
        _____: HTTPMethod
    ): Promise<boolean> => {
        return false;
    };
    handleError = (err: STError, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };
    getAllCORSHeaders = (): string[] => {
        return [];
    };
    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
