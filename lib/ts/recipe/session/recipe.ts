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
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import * as express from "express";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod } from "../../types";
import handleRefreshAPI from "./api/refresh";
import signOutAPI from "./api/signout";
import { REFRESH_API_PATH, SIGNOUT_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders } from "./cookieAndHeaders";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import APIImplementation from "./api/implementation";

// For Express
export default class SessionRecipe extends RecipeModule {
    private static instance: SessionRecipe | undefined = undefined;
    static RECIPE_ID = "session";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.recipeInterfaceImpl = this.config.override.functions(
            new RecipeImplementation(
                Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipeId),
                this.config,
                isInServerlessEnv
            )
        );
        this.apiImpl = this.config.override.apis(new APIImplementation());
    }

    static getInstanceOrThrowError(): SessionRecipe {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(SessionRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return SessionRecipe.instance;
            } else {
                throw new Error("Session recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        SessionRecipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(REFRESH_API_PATH),
                id: REFRESH_API_PATH,
                disabled: this.apiImpl.refreshPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGNOUT_API_PATH),
                id: SIGNOUT_API_PATH,
                disabled: this.apiImpl.signOutPOST === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        __: NormalisedURLPath,
        ___: HTTPMethod
    ) => {
        let options = {
            config: this.config,
            next,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };
        if (id === REFRESH_API_PATH) {
            return await handleRefreshAPI(this.apiImpl, options);
        } else {
            return await signOutAPI(this.apiImpl, options);
        }
    };

    handleError = (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => {
        if (err.fromRecipe === SessionRecipe.RECIPE_ID) {
            if (err.type === STError.UNAUTHORISED) {
                return this.config.errorHandlers.onUnauthorised(err.message, request, response, next);
            } else if (err.type === STError.TRY_REFRESH_TOKEN) {
                return this.config.errorHandlers.onTryRefreshToken(err.message, request, response, next);
            } else if (err.type === STError.TOKEN_THEFT_DETECTED) {
                return this.config.errorHandlers.onTokenTheftDetected(
                    err.payload.sessionHandle,
                    err.payload.userId,
                    request,
                    response,
                    next
                );
            } else {
                return next(err);
            }
        } else {
            next(err);
        }
    };

    getAllCORSHeaders = (): string[] => {
        return getCORSAllowedHeadersFromCookiesAndHeaders();
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === SessionRecipe.RECIPE_ID;
    };
}
