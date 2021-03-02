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
import { TypeInput, NormalisedAppinfo, HTTPMethod, InputSchema } from "./types";
import axios from "axios";
import {
    normaliseInputAppInfoOrThrowError,
    getRIDFromRequest,
    normaliseHttpMethod,
    sendNon200Response,
    assertThatBodyParserHasBeenUsed,
    validateTheStructureOfUserInput,
} from "./utils";
import { Querier } from "./querier";
import RecipeModule from "./recipeModule";
import * as express from "express";
import { HEADER_RID, HEADER_FDI } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import SuperTokensError from "./error";

export default class SuperTokens {
    private static instance: SuperTokens | undefined;

    appInfo: NormalisedAppinfo;

    recipeModules: RecipeModule[];

    constructor(config: TypeInput) {
        validateTheStructureOfUserInput(config, InputSchema, "init function", undefined);
        this.appInfo = normaliseInputAppInfoOrThrowError(undefined, config.appInfo);

        Querier.init(
            config.supertokens.connectionURI.split(";").map((h) => new NormalisedURLDomain(undefined, h)),
            config.supertokens.apiKey
        );

        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new SuperTokensError({
                recipe: undefined,
                type: "GENERAL_ERROR",
                payload: new Error("Please provide at least one recipe to the supertokens.init function call"),
            });
        }

        this.recipeModules = config.recipeList.map((func) => {
            return func(this.appInfo);
        });

        // check if duplicate APIs are exposed by any recipe by mistake
        for (let i = 0; i < this.recipeModules.length; i++) {
            let recipe = this.recipeModules[i];
            let apisHandled = recipe.getAPIsHandled();
            let stringifiedApisHandled: string[] = apisHandled
                .map((api) => {
                    if (api.disabled) {
                        return "";
                    }
                    return api.method + ";" + api.pathWithoutApiBasePath.getAsStringDangerous();
                })
                .filter((i) => i !== "");
            let findDuplicates = (arr: string[]) => arr.filter((item, index) => arr.indexOf(item) != index);
            if (findDuplicates(stringifiedApisHandled).length !== 0) {
                throw new STError({
                    recipe,
                    type: STError.GENERAL_ERROR,
                    payload: new Error("Duplicate APIs exposed from recipe. Please combine them into one API"),
                });
            }
        }

        let telemetry = config.telemetry === undefined ? process.env.TEST_MODE !== "testing" : config.telemetry;

        if (telemetry) {
            this.sendTelemetry();
        }
    }

    sendTelemetry = async () => {
        try {
            let querier = Querier.getInstanceOrThrowError(undefined);
            let response = await querier.sendGetRequest(new NormalisedURLPath(undefined, "/telemetry"), {});
            let telemetryId: string | undefined;
            if (response.exists) {
                telemetryId = response.telemetryId;
            }
            await axios({
                method: "POST",
                url: "https://api.supertokens.io/0/st/telemetry",
                data: {
                    appName: this.appInfo.appName,
                    websiteDomain: this.appInfo.websiteDomain.getAsStringDangerous(),
                    telemetryId,
                },
                headers: {
                    "api-version": 2,
                },
            });
        } catch (ignored) {}
    };

    static init(config: TypeInput) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
        }
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                recipe: undefined,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        Querier.reset();
        SuperTokens.instance = undefined;
    }

    static getInstanceOrThrowError(): SuperTokens {
        if (SuperTokens.instance !== undefined) {
            return SuperTokens.instance;
        }
        throw new STError({
            type: STError.GENERAL_ERROR,
            recipe: undefined,
            payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
        });
    }

    // instance functions below......

    middleware = () => {
        return async (request: express.Request, response: express.Response, next: express.NextFunction) => {
            let path = new NormalisedURLPath(
                undefined,
                request.originalUrl === undefined ? request.url : request.originalUrl
            );
            let method: HTTPMethod = normaliseHttpMethod(request.method);

            // if the prefix of the URL doesn't match the base path, we skip
            if (!path.startsWith(this.appInfo.apiBasePath)) {
                return next();
            }

            let requestRID = getRIDFromRequest(request);
            if (requestRID !== undefined) {
                let matchedRecipe: RecipeModule | undefined = undefined;

                // we loop through all recipe modules to find the one with the matching rId
                for (let i = 0; i < this.recipeModules.length; i++) {
                    if (this.recipeModules[i].getRecipeId() === requestRID) {
                        matchedRecipe = this.recipeModules[i];
                        break;
                    }
                }

                if (matchedRecipe === undefined) {
                    // we could not find one, so we skip
                    return next();
                }

                let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
                if (id === undefined) {
                    // the matched recipe doesn't handle this path and http method
                    return next();
                }

                // give task to the matched recipe
                return await this.handleAPI(matchedRecipe, id, request, response, next);
            } else {
                // we loop through all recipe modules to find the one with the matching path and method
                for (let i = 0; i < this.recipeModules.length; i++) {
                    let id = this.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                    if (id !== undefined) {
                        return await this.handleAPI(this.recipeModules[i], id, request, response, next);
                    }
                }
                return next();
            }
        };
    };

    handleAPI = async (
        matchedRecipe: RecipeModule,
        id: string,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ) => {
        try {
            await assertThatBodyParserHasBeenUsed(matchedRecipe, request, response);
            return await matchedRecipe.handleAPIRequest(id, request, response, next);
        } catch (err) {
            if (!STError.isErrorFromSuperTokens(err)) {
                err = new STError({
                    type: STError.GENERAL_ERROR,
                    payload: err,
                    recipe: matchedRecipe,
                });
            }
            return next(err);
        }
    };

    errorHandler = () => {
        return async (err: any, request: express.Request, response: express.Response, next: express.NextFunction) => {
            if (STError.isErrorFromSuperTokens(err)) {
                // if it's a general error, we extract the actual error and call the user's error handler
                if (err.type === STError.GENERAL_ERROR) {
                    return next(err.payload);
                }

                if (err.type === STError.BAD_INPUT_ERROR) {
                    return sendNon200Response(err.recipe, response, err.message, 400);
                }

                // we loop through all the recipes and pass the error to the one that matches the rId
                for (let i = 0; i < this.recipeModules.length; i++) {
                    if (this.recipeModules[i].isErrorFromThisRecipeBasedOnRid(err)) {
                        try {
                            return this.recipeModules[i].handleError(err, request, response, next);
                        } catch (error) {
                            return next(error);
                        }
                    }
                }
            }

            return next(err);
        };
    };

    getAllCORSHeaders = (): string[] => {
        let headerSet = new Set<string>();
        headerSet.add(HEADER_RID);
        headerSet.add(HEADER_FDI);
        this.recipeModules.forEach((recipe) => {
            let headers = recipe.getAllCORSHeaders();
            headers.forEach((h) => {
                headerSet.add(h);
            });
        });
        return Array.from(headerSet);
    };
}
