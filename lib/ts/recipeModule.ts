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

import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod } from "./types";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./framework";

export default abstract class RecipeModule {
    private recipeId: string;

    private appInfo: NormalisedAppinfo;

    constructor(recipeId: string, appInfo: NormalisedAppinfo) {
        this.recipeId = recipeId;
        this.appInfo = appInfo;
    }

    getRecipeId = (): string => {
        return this.recipeId;
    };

    getAppInfo = (): NormalisedAppinfo => {
        return this.appInfo;
    };

    returnAPIIdIfCanHandleRequest = (path: NormalisedURLPath, method: HTTPMethod): string | undefined => {
        let apisHandled = this.getAPIsHandled();
        for (let i = 0; i < apisHandled.length; i++) {
            let currAPI = apisHandled[i];
            if (
                !currAPI.disabled &&
                currAPI.method === method &&
                this.appInfo.apiBasePath.appendPath(currAPI.pathWithoutApiBasePath).equals(path)
            ) {
                return currAPI.id;
            }
        }
        return undefined;
    };

    abstract getAPIsHandled(): APIHandled[];

    abstract handleAPIRequest(
        id: string,
        req: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ): Promise<boolean>;

    abstract handleError(error: STError, request: BaseRequest, response: BaseResponse): Promise<void>;

    abstract getAllCORSHeaders(): string[];

    abstract isErrorFromThisRecipe(err: any): err is STError;
}
