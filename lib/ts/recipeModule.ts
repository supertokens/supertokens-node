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
import { NormalisedAppinfo, APIHandled, HTTPMethod, UserContext } from "./types";
import NormalisedURLPath from "./normalisedURLPath";
import type { BaseRequest, BaseResponse } from "./framework";
import { DEFAULT_TENANT_ID } from "./recipe/multitenancy/constants";
import { Querier } from "./querier";
import type SuperTokens from "./supertokens";

export default abstract class RecipeModule {
    private recipeId: string;
    protected appInfo: NormalisedAppinfo;
    protected stInstance: SuperTokens;
    protected querier: Querier;

    constructor(stInstance: SuperTokens, recipeId: string, appInfo: NormalisedAppinfo) {
        this.stInstance = stInstance;
        this.querier = Querier.getNewInstanceOrThrowError(stInstance, recipeId);
        this.recipeId = recipeId;
        this.appInfo = appInfo;
    }

    getRecipeId = (): string => {
        return this.recipeId;
    };

    getAppInfo = (): NormalisedAppinfo => {
        return this.appInfo;
    };

    returnAPIIdIfCanHandleRequest = async (
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ): Promise<{ id: string; tenantId: string; exactMatch: boolean } | undefined> => {
        let apisHandled = this.getAPIsHandled();

        const basePathStr = this.appInfo.apiBasePath.getAsStringDangerous();
        const pathStr = path.getAsStringDangerous();
        const regex = new RegExp(`^${basePathStr}(?:/([a-zA-Z0-9-]+))?(/.*)$`);

        const match = pathStr.match(regex);
        let tenantId: string = DEFAULT_TENANT_ID;
        let remainingPath: NormalisedURLPath | undefined = undefined;

        if (match) {
            tenantId = match[1];
            remainingPath = new NormalisedURLPath(match[2]);
        }

        const mtRecipe = this.stInstance.getRecipeInstanceOrThrow("multitenancy");

        for (let i = 0; i < apisHandled.length; i++) {
            let currAPI = apisHandled[i];
            if (!currAPI.disabled && currAPI.method === method) {
                if (this.appInfo.apiBasePath.appendPath(currAPI.pathWithoutApiBasePath).equals(path)) {
                    const finalTenantId = await mtRecipe.recipeInterfaceImpl.getTenantId({
                        tenantIdFromFrontend: DEFAULT_TENANT_ID,
                        userContext,
                    });
                    return { id: currAPI.id, tenantId: finalTenantId, exactMatch: true };
                } else if (
                    remainingPath !== undefined &&
                    this.appInfo.apiBasePath
                        .appendPath(currAPI.pathWithoutApiBasePath)
                        .equals(this.appInfo.apiBasePath.appendPath(remainingPath))
                ) {
                    const finalTenantId = await mtRecipe.recipeInterfaceImpl.getTenantId({
                        tenantIdFromFrontend: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
                        userContext,
                    });
                    return { id: currAPI.id, tenantId: finalTenantId, exactMatch: false };
                }
            }
        }
        return undefined;
    };

    abstract getAPIsHandled(): APIHandled[];

    abstract handleAPIRequest(
        id: string,
        tenantId: string,
        req: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean>;

    abstract handleError(
        error: STError,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ): Promise<void>;

    abstract getAllCORSHeaders(): string[];

    abstract isErrorFromThisRecipe(err: any): err is STError;
}
