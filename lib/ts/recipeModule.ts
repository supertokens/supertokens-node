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

import { Querier } from "./querier";
import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod } from "./types";
import * as express from "express";
import NormalisedURLPath from "./normalisedURLPath";

export default abstract class RecipeModule {
    private recipeId: string;

    private querier: Querier | undefined;

    private appInfo: NormalisedAppinfo;

    private rIdToCore: string | undefined;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, rIdToCore?: string) {
        this.recipeId = recipeId;
        this.appInfo = appInfo;
        this.rIdToCore = rIdToCore;
    }

    getRecipeId = (): string => {
        return this.recipeId;
    };

    getAppInfo = (): NormalisedAppinfo => {
        return this.appInfo;
    };

    getQuerier = (): Querier => {
        if (this.querier === undefined) {
            this.querier = Querier.getInstanceOrThrowError(this, this.rIdToCore);
        }
        return this.querier;
    };

    isErrorFromThisRecipeBasedOnRid = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.getRecipeId() === this.recipeId;
    };

    returnAPIIdIfCanHandleRequest = (path: NormalisedURLPath, method: HTTPMethod): string | undefined => {
        let apisHandled = this.getAPIsHandled();
        for (let i = 0; i < apisHandled.length; i++) {
            let currAPI = apisHandled[i];
            if (
                !currAPI.disabled &&
                currAPI.method === method &&
                this.appInfo.apiBasePath.appendPath(this, currAPI.pathWithoutApiBasePath).equals(path)
            ) {
                return currAPI.id;
            }
        }
        return undefined;
    };

    abstract isErrorFromThisOrChildRecipeBasedOnInstance(err: any): err is STError;

    abstract getAPIsHandled(): APIHandled[];

    abstract handleAPIRequest(
        id: string,
        req: express.Request,
        response: express.Response,
        next: express.NextFunction,
        path: NormalisedURLPath,
        method: HTTPMethod
    ): Promise<void>;

    abstract handleError(
        error: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void;

    abstract getAllCORSHeaders(): string[];
}
