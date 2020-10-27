/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo, APIHandled } from "../../types";
import * as express from "express";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "email-password";

    config: TypeNormalisedInput;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
    }

    // TODO: init function
    // TODO: getInstanceOrThrowError
    // TODO: reset

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        // TODO:
        return [];
    };

    handleAPIRequest = (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        // TODO:
    };

    handleError = (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => {
        // TODO:
    };

    getAllCORSHeaders = (): string[] => {
        // TODO:
        return [];
    };

    // instance functions below...............

    // TODO: feature functions.
}
